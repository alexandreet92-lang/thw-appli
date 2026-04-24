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
import { getAnthropicClient, parseJsonResponse } from '@/lib/agents/base'
import { createServiceClient } from '@/lib/supabase/server'

// ── System prompt ─────────────────────────────────────────────

const SYSTEM = `Tu es un agent de veille matinale pour Alex.
Chaque matin tu recherches les actualites des dernieres 24h dans 5 categories.

CATEGORIES (dans cet ordre exact, avec ces noms exacts) :
1. IA & Tech          : 5 articles
2. Business           : 5 articles
3. Bourse             : 5 articles (CAC40, SP500, Nasdaq, actus finance)
4. Sport              : 5 articles (endurance, hybride, Hyrox)
5. Tech & Innovation  : 5 articles

VEILLE :
Utilise le tool web_search pour trouver des actualites fraiches des dernieres 24h.
Pour chaque article, resume en 4-5 phrases couvrant : contexte, ce qui s'est passe, impact, ce que ca change.
Indique la source exacte (nom du media + date si disponible).

IMPORTANCE — une de ces 3 valeurs exactement :
- "Majeur"    : evenement qui bouge significativement le marche / la discipline
- "Important" : actualite notable mais impact modere
- "A suivre"  : signal faible ou tendance emergente

A RETENIR : 3 points cles du jour, courts (1 phrase chacun).

RETOURNE UNIQUEMENT UN OBJET JSON VALIDE.
Aucun texte avant ou apres. Aucun bloc markdown. Aucune explication.

Format EXACT :
{
  "date": "YYYY-MM-DD",
  "temps_lecture_min": <integer>,
  "a_retenir": ["point 1", "point 2", "point 3"],
  "categories": [
    {
      "nom": "IA & Tech",
      "articles": [
        { "titre": "...", "importance": "Majeur", "resume": "...", "source": "Nom du media" }
      ]
    },
    { "nom": "Business",        "articles": [...] },
    { "nom": "Bourse",          "articles": [...] },
    { "nom": "Sport",           "articles": [...] },
    { "nom": "Tech & Innovation","articles": [...] }
  ]
}`

// ── Types internes ────────────────────────────────────────────

type TabKey = 'ia_tech' | 'business' | 'bourse' | 'sport' | 'tech_innovation'

const KEY_ORDER: readonly TabKey[] = [
  'ia_tech', 'business', 'bourse', 'sport', 'tech_innovation',
] as const

interface Article {
  titre: string
  importance: string
  resume: string
  source: string
}

interface AgentCategory {
  nom?: string
  articles?: unknown[]
}

interface AgentOutput {
  date?: string
  temps_lecture_min?: number
  a_retenir?: string[]
  categories?: AgentCategory[]
}

interface NormalizedContent {
  date: string
  temps_lecture_min: number
  a_retenir: string[]
  categories: Partial<Record<TabKey, Article[]>>
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
  if (/\bia\b/.test(n) || n.includes('intelligence artificielle')) return 'ia_tech'
  if (n.includes('bourse') || n.includes('cac') || n.includes('nasdaq') ||
      n.includes('sp500') || n.includes('s&p') || n.includes('finance')) return 'bourse'
  if (n.includes('sport') || n.includes('endurance') ||
      n.includes('hybride') || n.includes('hyrox')) return 'sport'
  if (n.includes('business') || n.includes('economi') || n.includes('économi')) return 'business'
  if (n.includes('tech') || n.includes('innovation')) return 'tech_innovation'
  // Fallback positionnel (on a demandé 5 catégories dans un ordre précis).
  return KEY_ORDER[Math.min(Math.max(positionIndex, 0), KEY_ORDER.length - 1)]
}

function sanitizeArticle(raw: unknown): Article | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  const titre = typeof o.titre === 'string' ? o.titre : null
  const resume = typeof o.resume === 'string' ? o.resume : null
  if (!titre || !resume) return null
  return {
    titre,
    resume,
    importance: typeof o.importance === 'string' ? o.importance : 'A suivre',
    source: typeof o.source === 'string' ? o.source : '',
  }
}

function normalizeContent(raw: unknown): NormalizedContent {
  const input = (raw ?? {}) as AgentOutput
  const out: NormalizedContent = {
    date: typeof input.date === 'string' ? input.date : todayIso(),
    temps_lecture_min: typeof input.temps_lecture_min === 'number' ? input.temps_lecture_min : 7,
    a_retenir: Array.isArray(input.a_retenir)
      ? input.a_retenir.filter((s): s is string => typeof s === 'string').slice(0, 3)
      : [],
    categories: {},
  }

  // Supporte les deux formes : array [{nom, articles}] (demandée dans le prompt)
  // ou objet keyé {ia_tech: [...]} (défense en profondeur si le modèle dévie).
  const rawCats = (raw as { categories?: unknown })?.categories

  if (Array.isArray(rawCats)) {
    rawCats.forEach((cat, i) => {
      const c = cat as AgentCategory
      const key = mapNomToKey(c.nom ?? '', i)
      const articles = Array.isArray(c.articles)
        ? c.articles.map(sanitizeArticle).filter((a): a is Article => a !== null)
        : []
      if (articles.length > 0) {
        out.categories[key] = articles
      }
    })
  } else if (rawCats && typeof rawCats === 'object') {
    const obj = rawCats as Record<string, unknown>
    for (const key of KEY_ORDER) {
      const arr = obj[key]
      if (Array.isArray(arr)) {
        const articles = arr.map(sanitizeArticle).filter((a): a is Article => a !== null)
        if (articles.length > 0) out.categories[key] = articles
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
    const textBlocks = resp.content.filter(
      (b): b is { type: 'text'; text: string } => b.type === 'text',
    )
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

    return NextResponse.json({ briefing: data })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.log('[briefing/generate] Fatal:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
