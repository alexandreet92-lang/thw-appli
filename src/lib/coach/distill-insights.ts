// ══════════════════════════════════════════════════════════════
// Distillation des insights — couche d'apprentissage du coach (phase 3).
//
// Rend la boucle AUTONOME :
//  1) distillNewInsights() : un « professeur » IA lit les retours 👍/👎
//     non encore traités, en extrait des enseignements généralisables et
//     anonymes, et les insère en 'candidate' (source 'mined'). Tu les
//     valides ensuite à la main (cohérent avec la curation manuelle).
//  2) recomputeInsightScores() : associe (par sport + mots-clés du topic,
//     même logique que l'injection) les retours aux insights pour faire
//     monter/descendre leur score, et retire automatiquement un insight
//     ACTIF dont le score s'effondre.
//
// Tout est best-effort et borné en volume → coût et tokens maîtrisés.
// Lecture/écriture via service role (base partagée).
// ══════════════════════════════════════════════════════════════

import { createServiceClient } from '@/lib/supabase/server'
import { callAgent } from '@/lib/agents/base'
import { invalidateInsightsCache } from '@/lib/coach/learned-insights'

const SPORTS = new Set(['running', 'cycling', 'hyrox', 'gym'])

const BATCH = 60               // retours lus par passage
const MIN_TO_DISTILL = 3       // en-deçà, on ne dérange pas le modèle
const MAX_NEW_INSIGHTS = 8     // garde-fou sur la sortie du modèle
const RETIRE_THRESHOLD = -5    // score ≤ → un insight ACTIF est retiré auto
const SCORE_WINDOW_DAYS = 90

interface FbRow {
  id: string
  rating: number
  sport: string | null
  user_message: string | null
  assistant_message: string | null
}

function clip(s: string | null | undefined, n: number): string {
  if (!s) return ''
  const t = s.trim()
  return t.length > n ? t.slice(0, n) + '…' : t
}
function norm(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

// ── 1) DISTILLATION ───────────────────────────────────────────
export async function distillNewInsights(): Promise<{ created: number; processed: number; skipped?: string }> {
  const sb = createServiceClient()

  const { data, error } = await sb
    .from('coach_feedback')
    .select('id, rating, sport, user_message, assistant_message')
    .is('processed_at', null)
    .order('created_at', { ascending: true })
    .limit(BATCH)
  if (error) { console.error('[distill] read feedback:', error); return { created: 0, processed: 0, skipped: 'read_error' } }

  const rows = (data ?? []) as FbRow[]
  if (rows.length < MIN_TO_DISTILL) {
    return { created: 0, processed: 0, skipped: 'not_enough_feedback' }
  }

  // Corpus compact pour le modèle (anonyme : pas d'id, pas de nom)
  const corpus = rows.map((r, i) => {
    const verdict = r.rating === 1 ? 'BON (à reproduire)' : 'MAUVAIS (à éviter)'
    return `### Échange ${i + 1} — ${verdict}${r.sport ? ` — sport: ${r.sport}` : ''}\n` +
      `Q: ${clip(r.user_message, 400)}\n` +
      `R: ${clip(r.assistant_message, 600)}`
  }).join('\n\n')

  const systemPrompt =
    `Tu es un coach sportif expert. On te donne des retours réels (👍/👎) d'athlètes sur des réponses d'un coach IA. ` +
    `Distille-en des ENSEIGNEMENTS généralisables, anonymes et actionnables, réutilisables pour d'autres athlètes. ` +
    `Règles STRICTES :\n` +
    `- Aucune donnée personnelle (pas de nom, chiffre perso isolé, date) — uniquement des patterns.\n` +
    `- Un retour 👍 → enseignement de ce qu'il faut FAIRE ; un 👎 → ce qu'il faut ÉVITER.\n` +
    `- N'invente rien : si les retours ne dégagent pas de pattern clair, renvoie peu (ou zéro) enseignement.\n` +
    `- "sport" ∈ {running, cycling, hyrox, gym} si l'enseignement est spécifique, sinon null.\n` +
    `- "topic" = 2 à 5 mots-clés de ciblage (ex: "pma 30/30 vo2max").\n` +
    `- "insight_text" = 1 à 2 phrases, concret.\n` +
    `Réponds UNIQUEMENT en JSON: {"insights":[{"sport":string|null,"topic":string,"insight_text":string}]} ` +
    `(au plus ${MAX_NEW_INSIGHTS}).`

  let parsed: { insights?: { sport?: string | null; topic?: string; insight_text?: string }[] }
  try {
    parsed = await callAgent<typeof parsed>({
      agentName: 'distill-insights',
      model: 'balanced',
      maxTokens: 1200,
      systemPrompt,
      userPrompt: corpus,
    })
  } catch (e) {
    console.error('[distill] model error:', e)
    return { created: 0, processed: 0, skipped: 'model_error' }
  }

  const candidates = (parsed?.insights ?? [])
    .slice(0, MAX_NEW_INSIGHTS)
    .map(c => ({
      sport: typeof c.sport === 'string' && SPORTS.has(c.sport) ? c.sport : null,
      topic: typeof c.topic === 'string' ? c.topic.trim().slice(0, 120) : '',
      insight_text: typeof c.insight_text === 'string' ? c.insight_text.trim().slice(0, 2000) : '',
    }))
    .filter(c => c.topic && c.insight_text)

  let created = 0
  if (candidates.length > 0) {
    const { error: insErr } = await sb.from('coach_insights').insert(
      candidates.map(c => ({ ...c, status: 'candidate', source: 'mined' })),
    )
    if (insErr) console.error('[distill] insert insights:', insErr)
    else created = candidates.length
  }

  // Idempotence : on marque TOUS les retours lus comme traités (même ceux non
  // exploités) pour ne pas les re-soumettre indéfiniment.
  const ids = rows.map(r => r.id)
  const { error: upErr } = await sb
    .from('coach_feedback')
    .update({ processed_at: new Date().toISOString() })
    .in('id', ids)
  if (upErr) console.error('[distill] mark processed:', upErr)

  if (created > 0) invalidateInsightsCache()
  return { created, processed: ids.length }
}

// ── 2) SCORING + RETRAIT AUTO ─────────────────────────────────
// Association heuristique (sport + mots-clés du topic), même logique que
// l'injection : le score n'est pas une attribution exacte mais une tendance.
export async function recomputeInsightScores(): Promise<{ updated: number; retired: number }> {
  const sb = createServiceClient()

  const [{ data: insData }, { data: fbData }] = await Promise.all([
    sb.from('coach_insights').select('id, sport, topic, status, score').neq('status', 'retired').limit(500),
    sb.from('coach_feedback')
      .select('rating, sport, user_message, assistant_message')
      .gte('created_at', new Date(Date.now() - SCORE_WINDOW_DAYS * 86400000).toISOString())
      .limit(2000),
  ])

  const insights = (insData ?? []) as { id: string; sport: string | null; topic: string; status: string; score: number }[]
  const fb = (fbData ?? []) as FbRow[]
  if (insights.length === 0) return { updated: 0, retired: 0 }

  // Pré-normalise les retours une fois.
  const fbN = fb.map(f => ({
    rating: f.rating,
    sport: f.sport,
    hay: norm(`${f.user_message ?? ''} ${f.assistant_message ?? ''}`),
  }))

  let updated = 0, retired = 0
  for (const ins of insights) {
    const words = norm(ins.topic).split(/[\s,;/]+/).filter(w => w.length >= 3)
    if (words.length === 0) continue
    let score = 0
    for (const f of fbN) {
      const sportOk = ins.sport === null || f.sport === ins.sport
      if (!sportOk) continue
      if (words.some(w => f.hay.includes(w))) score += f.rating
    }
    const patch: Record<string, unknown> = { score, updated_at: new Date().toISOString() }
    let nowRetired = false
    if (ins.status === 'active' && score <= RETIRE_THRESHOLD) {
      patch.status = 'retired'
      nowRetired = true
    }
    if (score !== ins.score || nowRetired) {
      const { error } = await sb.from('coach_insights').update(patch).eq('id', ins.id)
      if (!error) { updated++; if (nowRetired) retired++ }
    }
  }

  if (updated > 0) invalidateInsightsCache()
  return { updated, retired }
}

export async function runLearningPass(): Promise<{ created: number; processed: number; updated: number; retired: number; skipped?: string }> {
  const distill = await distillNewInsights()
  const score = await recomputeInsightScores()
  return { ...distill, updated: score.updated, retired: score.retired }
}
