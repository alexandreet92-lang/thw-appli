// ══════════════════════════════════════════════════════════════
// POST /api/briefing/generate
// Appel direct Claude (claude-sonnet-4-6) avec tool web_search pour
// générer le briefing matinal. System prompt intégré (veille 5 catégories,
// JSON uniquement). Normalise ensuite le tableau `categories` renvoyé par
// le modèle vers la forme keyée attendue par la page /briefing, puis
// upsert dans daily_briefing pour CREATOR_USER_ID.
//
// L'insert utilise le service client Supabase (bypass RLS) car on écrit
// pour un user_id figé côté serveur, pas pour l'utilisateur connecté.
// ══════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server'
import type Anthropic from '@anthropic-ai/sdk'
import { getAnthropicClient, parseJsonResponse } from '@/lib/agents/base'
import { createServiceClient } from '@/lib/supabase/server'
import { enforceQuota } from '@/lib/subscriptions/quota-middleware'
import { logUsage } from '@/lib/subscriptions/check-quota'

// ── System prompt ─────────────────────────────────────────────

const SYSTEM = `Tu es un agent de veille matinale pour Alex.
Chaque matin tu recherches les actualites des dernieres 24h dans 6 categories.

CATEGORIES (dans cet ordre exact) :

1. IA et technologie (5 minimum, 8 maximum)
   Identifier les acteurs principaux actifs du jour (Anthropic, OpenAI, Google,
   Meta, Mistral, xAI, etc.) et CREER UN SOUS-THEME PAR ACTEUR actif.
   Chaque sous-theme = 1 acteur = 1 a 3 articles.

2. Business et economie (5 articles)
   Sous-themes optionnels si l'actu s'y prete.

3. Bourse et finance (5 articles)
   CAC40, SP500, Nasdaq, macro, resultats d'entreprises.
   Sous-themes optionnels.

4. International (10 articles)
   Identifier les zones GEOPOLITIQUES ACTIVES du jour (Moyen-Orient, Europe,
   Asie, Amerique du Nord, Amerique latine, Afrique, etc.) et CREER UN SOUS-THEME
   PAR ZONE. Les sous-themes FLUCTUENT selon l'actualite du jour.

5. Sport endurance hybride (5 articles)
   Hyrox, trail, marathon, triathlon, fitness racing. Sous-themes optionnels.

6. Tech et innovation (5 articles)
   Hardware, robotique, biotech, innovations produit. Sous-themes optionnels.

VEILLE :
Utilise le tool web_search pour trouver des actualites fraiches des dernieres 24h.
Pour chaque article, resume en 4-5 phrases couvrant : contexte, ce qui s'est passe,
impact, ce que ca change.

IMPORTANCE — une de ces 3 valeurs exactement :
- "Majeur"    : evenement qui bouge significativement le marche / la discipline
- "Important" : actualite notable mais impact modere
- "A suivre"  : signal faible ou tendance emergente

SOURCES — pour CHAQUE article, fournir DEUX champs separes :
- "source_nom"  : nom du media (ex: "Reuters", "Le Monde", "Bloomberg")
- "source_date" : date de publication en francais (ex: "24 avril 2026")

A RETENIR : 3 points cles du jour, courts (1 phrase chacun).

RETOURNE UNIQUEMENT UN OBJET JSON VALIDE.
Aucun texte avant ou apres. Aucun bloc markdown. Aucune explication.

Format EXACT (tous les articles vivent DANS un sous-theme, meme les categories
sans decoupage naturel doivent exposer au moins un sous-theme "Général" ou
equivalent) :
{
  "date": "YYYY-MM-DD",
  "temps_lecture_min": <integer>,
  "a_retenir": ["point 1", "point 2", "point 3"],
  "categories": [
    {
      "nom": "IA et technologie",
      "sous_themes": [
        {
          "nom": "Anthropic",
          "articles": [
            {
              "titre": "...",
              "importance": "Majeur",
              "resume": "...",
              "source_nom": "Reuters",
              "source_date": "24 avril 2026"
            }
          ]
        },
        { "nom": "OpenAI",  "articles": [...] },
        { "nom": "Google",  "articles": [...] }
      ]
    },
    { "nom": "Business et economie", "sous_themes": [...] },
    { "nom": "Bourse et finance",    "sous_themes": [...] },
    {
      "nom": "International",
      "sous_themes": [
        { "nom": "Moyen-Orient", "articles": [...] },
        { "nom": "Europe",       "articles": [...] },
        { "nom": "Asie",         "articles": [...] }
      ]
    },
    { "nom": "Sport endurance hybride", "sous_themes": [...] },
    { "nom": "Tech et innovation",      "sous_themes": [...] }
  ]
}`

// ── Types internes ────────────────────────────────────────────

type TabKey =
  | 'ia_tech'
  | 'business'
  | 'bourse'
  | 'international'
  | 'sport'
  | 'tech_innovation'

const KEY_ORDER: readonly TabKey[] = [
  'ia_tech', 'business', 'bourse', 'international', 'sport', 'tech_innovation',
] as const

const KEY_LABELS: Record<TabKey, string> = {
  ia_tech:         'IA & Tech',
  business:        'Business',
  bourse:          'Bourse',
  international:   'International',
  sport:           'Sport',
  tech_innovation: 'Tech & Innovation',
}

interface Article {
  titre: string
  importance: string
  resume: string
  source_nom: string
  source_date: string
}

interface SubTheme {
  nom: string
  articles: Article[]
}

interface Category {
  key: TabKey
  nom: string
  sous_themes: SubTheme[]
}

interface NormalizedContent {
  date: string
  temps_lecture_min: number
  a_retenir: string[]
  categories: Category[]
}

// ── Helpers ───────────────────────────────────────────────────

function todayIso(): string {
  const d = new Date()
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

// Map un nom de catégorie libre → TabKey canonique.
// Ordre de priorité choisi pour éviter les collisions (ex. "IA & Tech"
// matcherait aussi "tech" → on check IA d'abord).
function mapNomToKey(nom: string, positionIndex: number): TabKey {
  const n = (nom ?? '').toLowerCase()
  // IA d'abord (contient "tech" aussi → collision)
  if (/\bia\b/.test(n) || n.includes('intelligence artificielle')) return 'ia_tech'
  // International (unique, avant bourse qui a "finance")
  if (n.includes('international') || n.includes('geopolit') || n.includes('géopolit')) return 'international'
  if (n.includes('bourse') || n.includes('cac') || n.includes('nasdaq') ||
      n.includes('sp500') || n.includes('s&p') || n.includes('finance')) return 'bourse'
  if (n.includes('sport') || n.includes('endurance') ||
      n.includes('hybride') || n.includes('hyrox')) return 'sport'
  if (n.includes('business') || n.includes('economi') || n.includes('économi')) return 'business'
  if (n.includes('tech') || n.includes('innovation')) return 'tech_innovation'
  // Fallback positionnel (6 catégories dans l'ordre KEY_ORDER).
  return KEY_ORDER[Math.min(Math.max(positionIndex, 0), KEY_ORDER.length - 1)]
}

function sanitizeArticle(raw: unknown): Article | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  const titre = typeof o.titre === 'string' ? o.titre : null
  const resume = typeof o.resume === 'string' ? o.resume : null
  if (!titre || !resume) return null

  // source_nom / source_date sont les nouveaux champs.
  // Compatibilité : si l'ancien champ `source` est présent seul, on le
  // reporte dans source_nom.
  let source_nom = typeof o.source_nom === 'string' ? o.source_nom : ''
  let source_date = typeof o.source_date === 'string' ? o.source_date : ''
  if (!source_nom && !source_date && typeof o.source === 'string') {
    source_nom = o.source
  }

  return {
    titre,
    resume,
    importance: typeof o.importance === 'string' ? o.importance : 'A suivre',
    source_nom,
    source_date,
  }
}

function sanitizeSubTheme(raw: unknown): SubTheme | null {
  if (!raw || typeof raw !== 'object') return null
  const s = raw as { nom?: unknown; articles?: unknown }
  const nom = typeof s.nom === 'string' && s.nom.trim() ? s.nom.trim() : 'Général'
  const articles = Array.isArray(s.articles)
    ? s.articles.map(sanitizeArticle).filter((a): a is Article => a !== null)
    : []
  if (articles.length === 0) return null
  return { nom, articles }
}

function normalizeContent(raw: unknown): NormalizedContent {
  const input = (raw ?? {}) as Record<string, unknown>

  const out: NormalizedContent = {
    date: typeof input.date === 'string' ? input.date : todayIso(),
    temps_lecture_min: typeof input.temps_lecture_min === 'number' ? input.temps_lecture_min : 7,
    a_retenir: Array.isArray(input.a_retenir)
      ? input.a_retenir.filter((s): s is string => typeof s === 'string').slice(0, 3)
      : [],
    categories: [],
  }

  const rawCats = input.categories

  if (Array.isArray(rawCats)) {
    // Forme attendue : [{nom, sous_themes: [...]}] (nouveau) ou [{nom, articles: [...]}] (ancien)
    rawCats.forEach((cat, i) => {
      const c = cat as { nom?: unknown; sous_themes?: unknown; articles?: unknown }
      const nom = typeof c.nom === 'string' ? c.nom : ''
      const key = mapNomToKey(nom, i)

      let sous_themes: SubTheme[] = []
      if (Array.isArray(c.sous_themes) && c.sous_themes.length > 0) {
        sous_themes = c.sous_themes.map(sanitizeSubTheme).filter((s): s is SubTheme => s !== null)
      } else if (Array.isArray(c.articles)) {
        // Ancien format array sans sous_themes → on wrap en un seul sous-theme
        const arts = c.articles.map(sanitizeArticle).filter((a): a is Article => a !== null)
        if (arts.length > 0) {
          sous_themes = [{ nom: nom || KEY_LABELS[key], articles: arts }]
        }
      }

      if (sous_themes.length > 0) {
        out.categories.push({ key, nom: nom || KEY_LABELS[key], sous_themes })
      }
    })
  } else if (rawCats && typeof rawCats === 'object') {
    // Ancien format keyed : { ia_tech: [...], business: [...], ... }
    const obj = rawCats as Record<string, unknown>
    for (const key of KEY_ORDER) {
      const arr = obj[key]
      if (Array.isArray(arr)) {
        const arts = arr.map(sanitizeArticle).filter((a): a is Article => a !== null)
        if (arts.length > 0) {
          out.categories.push({
            key,
            nom: KEY_LABELS[key],
            sous_themes: [{ nom: KEY_LABELS[key], articles: arts }],
          })
        }
      }
    }
  }

  return out
}

// ── Handler ───────────────────────────────────────────────────

export async function POST(req: NextRequest): Promise<NextResponse> {
  const creatorId = process.env.CREATOR_USER_ID
  if (!creatorId) {
    return NextResponse.json(
      { error: 'CREATOR_USER_ID manquant dans l\'environnement serveur.' },
      { status: 500 },
    )
  }

  // ── Quota briefing (vérifie fréquence hebdo pour le creator) ─
  const check = await enforceQuota(creatorId, 'briefing')
  if (!check.allowed) return check.response as NextResponse

  // Body optionnel — contexte additionnel injecté dans le prompt user
  let extraContext: Record<string, unknown> = {}
  try {
    extraContext = await req.json() as Record<string, unknown>
  } catch {
    /* pas de body, on continue */
  }

  try {
    const client = getAnthropicClient()

    const userPrompt =
      `Génère le briefing matinal du jour (${todayIso()}).\n` +
      `Respecte strictement le format JSON spécifié et les 5 catégories dans l'ordre.` +
      (Object.keys(extraContext).length > 0
        ? `\n\nContexte complémentaire :\n${JSON.stringify(extraContext, null, 2)}`
        : '')

    const resp = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 8000,
      system: SYSTEM,
      messages: [{ role: 'user', content: userPrompt }],
      tools: [
        {
          type: 'web_search_20250305',
          name: 'web_search',
          max_uses: 20,
        },
      ] as unknown as Parameters<typeof client.messages.create>[0]['tools'],
    })

    // Avec web_search, le modèle peut émettre plusieurs blocs (tool_use
    // intercalés). Le JSON final est dans le DERNIER bloc de type text.
    // On évite le type predicate (incompatible avec ContentBlock qui
    // inclut `citations`) en castant vers le type exact du SDK.
    const textBlocks = resp.content.filter(b => b.type === 'text') as Anthropic.TextBlock[]
    const finalText = textBlocks[textBlocks.length - 1]?.text
    if (!finalText) {
      console.log('[briefing/generate] No text block in response. Stop reason:', resp.stop_reason)
      return NextResponse.json({ error: 'Réponse modèle vide.' }, { status: 502 })
    }

    let rawContent: unknown
    try {
      rawContent = parseJsonResponse<unknown>(finalText)
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      console.log('[briefing/generate] JSON parse failed:', msg)
      console.log('[briefing/generate] raw tail:', finalText.slice(-200))
      return NextResponse.json({ error: 'Réponse modèle non-JSON.' }, { status: 502 })
    }

    // Normalisation : array → keyed, sanitize articles, défaults
    const content = normalizeContent(rawContent)
    const date = todayIso()

    const sb = createServiceClient()
    const { data, error } = await sb
      .from('daily_briefing')
      .upsert(
        {
          user_id: creatorId,
          date,
          content: content as unknown as Record<string, unknown>,
          lu: false,
        },
        { onConflict: 'user_id,date' },
      )
      .select()
      .single()

    if (error) {
      console.log('[briefing/generate] DB upsert failed:', error.message)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // ── Log usage briefing (fire-and-forget) ─────────────────────
    void logUsage(creatorId, 'briefing', {
      model: 'claude-sonnet-4-6',
      web_search: true,
      date,
    })

    return NextResponse.json({ briefing: data })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.log('[briefing/generate] Fatal:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
