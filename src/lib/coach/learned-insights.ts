// ══════════════════════════════════════════════════════════════
// Learned Insights — couche d'apprentissage du coach (phase 2).
//
// Base de savoir INTER-utilisateurs : des leçons distillées et
// anonymisées (table coach_insights), validées manuellement, que l'on
// réinjecte dans le system prompt du coach central. C'est ce qui fait
// que « plus il y a d'utilisateurs et d'échanges, meilleur est le coach » :
// chaque athlète profite des patterns validés issus de l'usage global.
//
// Sélection ciblée : on ne prend que les insights ACTIFS, on filtre par
// sport (ou agnostiques), puis on classe par pertinence au message
// (mots-clés du topic présents) + score de réputation. Plafonné en
// nombre et en caractères → budget-token maîtrisé. Lecture via service
// client (la base est partagée, jamais exposée au client). Fail-open :
// toute erreur renvoie une chaîne vide, jamais bloquant.
// ══════════════════════════════════════════════════════════════

import { createServiceClient } from '@/lib/supabase/server'

interface InsightRow {
  id: string
  sport: string | null
  topic: string
  insight_text: string
  score: number | null
}

const MAX_INSIGHTS = 4         // au plus 4 leçons injectées
const MAX_CHARS = 1200         // plafond global du bloc (~300 tokens)
const CACHE_TTL_MS = 30_000    // cache court par sport (comme les compétences)

const cache = new Map<string, { value: string; expires: number }>()

export function invalidateInsightsCache(): void {
  cache.clear()
}

// Détection légère du sport à partir du message (best-effort, fail-open).
export function detectSport(message: string): string | null {
  const m = message.toLowerCase()
  if (/\b(hyrox)\b/.test(m)) return 'hyrox'
  if (/\b(v[ée]lo|cyclis|bike|ftp|watts?)\b/.test(m)) return 'cycling'
  if (/\b(course|courir|running|run|allure|10\s?km|semi|marathon)\b/.test(m)) return 'running'
  if (/\b(muscu|renfo|gym|force|hypertrophie|s[ée]ance\s+salle)\b/.test(m)) return 'gym'
  return null
}

function norm(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

/**
 * Construit le bloc « insights appris » à injecter dans le system prompt.
 * @param message       dernier message utilisateur (pour le ciblage)
 * @param sportHint     sport éventuellement déjà connu (sinon détecté)
 */
export async function buildLearnedInsights(message: string, sportHint?: string | null): Promise<string> {
  const sport = sportHint ?? detectSport(message ?? '')
  const cacheKey = `${sport ?? 'all'}::${norm(message ?? '').slice(0, 80)}`
  const cached = cache.get(cacheKey)
  if (cached && cached.expires > Date.now()) return cached.value

  let rows: InsightRow[] = []
  try {
    const sb = createServiceClient()
    let q = sb
      .from('coach_insights')
      .select('id, sport, topic, insight_text, score')
      .eq('status', 'active')
    // sport spécifique + agnostiques (sport NULL) ; si sport inconnu → tout
    if (sport) q = q.or(`sport.eq.${sport},sport.is.null`)
    const { data, error } = await q.limit(60)
    if (error || !data) {
      cache.set(cacheKey, { value: '', expires: Date.now() + CACHE_TTL_MS })
      return ''
    }
    rows = data as InsightRow[]
  } catch {
    return ''
  }

  if (rows.length === 0) {
    cache.set(cacheKey, { value: '', expires: Date.now() + CACHE_TTL_MS })
    return ''
  }

  // Score de pertinence : mots-clés du topic présents dans le message + réputation.
  const msgN = norm(message ?? '')
  const ranked = rows
    .map(r => {
      const topicWords = norm(r.topic).split(/[\s,;/]+/).filter(w => w.length >= 3)
      const hits = topicWords.filter(w => msgN.includes(w)).length
      const sportBonus = r.sport ? 2 : 0   // un insight ciblé sport prime sur un agnostique
      const relevance = hits * 3 + sportBonus + (r.score ?? 0) / 10
      return { r, relevance, hits }
    })
    // si le message matche au moins un topic → on garde les plus pertinents ;
    // sinon on retombe sur les mieux notés (réputation pure)
    .sort((a, b) => b.relevance - a.relevance)

  const anyHit = ranked.some(x => x.hits > 0)
  const selected = (anyHit ? ranked.filter(x => x.hits > 0) : ranked).slice(0, MAX_INSIGHTS)

  if (selected.length === 0) {
    cache.set(cacheKey, { value: '', expires: Date.now() + CACHE_TTL_MS })
    return ''
  }

  const lines: string[] = []
  let total = 0
  for (const { r } of selected) {
    const line = `- (${r.sport ?? 'général'} · ${r.topic}) ${r.insight_text.trim()}`
    if (total + line.length > MAX_CHARS) break
    lines.push(line)
    total += line.length
  }
  if (lines.length === 0) {
    cache.set(cacheKey, { value: '', expires: Date.now() + CACHE_TTL_MS })
    return ''
  }

  const block =
    `# Enseignements validés (issus de l'usage réel — à privilégier)\n` +
    `Ces enseignements proviennent de retours d'athlètes validés par le coaching THW. ` +
    `Tiens-en compte quand ils sont pertinents pour la demande, sans les citer comme des règles absolues :\n` +
    `${lines.join('\n')}\n` +
    `# Fin des enseignements validés`

  cache.set(cacheKey, { value: block, expires: Date.now() + CACHE_TTL_MS })
  return block
}
