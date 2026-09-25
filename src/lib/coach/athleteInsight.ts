// ══════════════════════════════════════════════════════════════════════════
// Coach cockpit — synthèse IA « vue coach » d'un athlète.
// C'est le CŒUR de la mission : l'IA a déjà lu les données de l'athlète, elle
// livre au coach une lecture courte et ACTIONNABLE (état / tendance / risque /
// action) → le coach ne passe du temps que là où c'est nécessaire = il suit
// beaucoup plus d'athlètes.
//
// Entrée : un RosterAthlete (déjà agrégé : charge 7j, TSB, fatigue, adhérence,
// blessure, course, inactivité) + la dernière interprétation IA de séance +
// la charge PMC (CTL/ATL/TSB) du jour. Sortie : objet JSON compact.
// Modèle « fast » (Haiku) : sortie courte, coût maîtrisé à l'échelle.
// ══════════════════════════════════════════════════════════════════════════
import type { SupabaseClient } from '@supabase/supabase-js'
import { getAnthropicClient, MODELS, parseJsonResponse } from '@/lib/agents/base'
import { computeUserLoad } from '@/lib/training/pmcServer'
import type { RosterAthlete } from '@/lib/coach/roster'

export type InsightPriority = 'ok' | 'watch' | 'urgent'

export interface AthleteInsight {
  headline: string          // 1 phrase : l'essentiel pour le coach
  state: string             // état actuel (forme, charge)
  trend: string             // tendance (progression / plateau / dérive)
  risk: string | null       // point d'attention / risque (null si rien)
  action: string            // action recommandée, concrète
  priority: InsightPriority // pour trier le roster / le brief
  generated_at: string      // ISO
}

// Résumé texte de la dernière interprétation IA de séance (si dispo).
function extractLastAnalysis(raw: unknown): string | null {
  if (!raw || typeof raw !== 'object') return null
  const interp = (raw as { interpretation?: Record<string, unknown> }).interpretation
  const exec = interp?.execution
  if (typeof exec === 'string' && exec.trim()) {
    // On ne garde que le début (verdict + narrative) pour rester compact.
    return exec.replace(/\s+/g, ' ').slice(0, 900)
  }
  const verdict = (raw as { verdict?: unknown }).verdict
  return typeof verdict === 'string' ? `verdict: ${verdict}` : null
}

/**
 * Génère la synthèse coach d'UN athlète. Ne stocke rien (le caller décide où).
 * Renvoie null si l'athlète n'a aucune donnée exploitable (aucune activité).
 */
export async function generateAthleteInsight(
  sb: SupabaseClient,
  athlete: RosterAthlete,
): Promise<AthleteInsight | null> {
  const now = new Date()

  // Dernière séance analysée (interprétation IA déjà produite).
  const { data: lastAct } = await sb
    .from('activities')
    .select('started_at, sport, ai_analysis')
    .eq('user_id', athlete.id)
    .not('ai_analysis', 'is', null)
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  const lastAnalysis = extractLastAnalysis((lastAct as { ai_analysis?: unknown } | null)?.ai_analysis)

  // Charge PMC (CTL/ATL/TSB + tendance) du jour.
  let load = null
  try { load = await computeUserLoad(sb, athlete.id, now) } catch { /* pas bloquant */ }

  // Rien d'exploitable → pas de synthèse (évite d'inventer).
  if (!lastAnalysis && !load && athlete.tss7 === 0 && athlete.lastDays === Infinity) return null

  const adherence = athlete.adhTotal > 0 ? `${athlete.adhDone}/${athlete.adhTotal} séances planifiées faites cette semaine` : 'aucun plan cette semaine'
  const raceLine = athlete.race ? `${athlete.race.name} dans ${athlete.race.days} j` : 'aucune course proche'

  const systemPrompt = `Tu es l'assistant d'un coach sportif qui suit de nombreux athlètes. Pour CHAQUE athlète, tu produis une synthèse ULTRA-COURTE et ACTIONNABLE destinée au COACH (pas à l'athlète). Le coach doit comprendre en 10 secondes où en est l'athlète et quoi faire.

RÈGLES :
- Tu écris POUR LE COACH, à la 3e personne (« il/elle », ou le prénom). Jamais « tu ».
- Ultra-concis : chaque champ = 1 à 2 phrases maximum. Pas de blabla, pas de listes.
- Concret et spécifique aux données fournies. N'invente RIEN : si une donnée manque, ne la mentionne pas.
- "action" = une recommandation que le coach peut appliquer/valider (ex : « alléger la semaine : -30% de volume », « planifier une séance de récup », « rien à faire, laisser progresser », « prendre des nouvelles, 8 j sans activité »).
- "priority" : "urgent" si surcharge/blessure/inactivité longue/risque net ; "watch" si à surveiller ; "ok" si tout va bien.
- "risk" : null s'il n'y a pas de point d'attention.

Tu réponds UNIQUEMENT en JSON valide, rien avant ni après.`

  const userPrompt = `ATHLÈTE : ${athlete.name}
Sports : ${athlete.sports.join(', ') || 'n/a'} · Niveau : ${athlete.level ?? 'n/a'} · Objectif : ${athlete.goal ?? 'n/a'}
Statut agrégé : ${athlete.status}${athlete.reason ? ` (${athlete.reason})` : ''}
Dernière activité : ${athlete.lastDays === Infinity ? 'aucune' : `il y a ${athlete.lastDays} j`}
Charge 7 jours (TSS) : ${athlete.tss7}
Fatigue subjective (moy 7j, /5) : ${athlete.fatigue != null ? athlete.fatigue.toFixed(1) : 'n/a'}
Adhérence : ${adherence}
Blessures actives : ${athlete.activeInjuries}
Course : ${raceLine}

CHARGE D'ENTRAÎNEMENT (PMC) :
${load
  ? `CTL (forme) ${load.ctl} · ATL (fatigue) ${load.atl} · TSB (fraîcheur) ${load.tsb} → « ${load.verdict} »${load.overload ? ' ⚠️ SURCHARGE' : ''} · tendance TSB ${load.trend}, forme ${load.ctlTrend}`
  : 'non disponible'}

DERNIÈRE LECTURE IA DE SÉANCE :
${lastAnalysis ?? 'aucune analyse disponible'}

Retourne CE JSON :
{
  "headline": "1 phrase : l'essentiel pour le coach.",
  "state": "État actuel (forme, charge) en 1-2 phrases.",
  "trend": "Tendance (progression / plateau / dérive) en 1 phrase.",
  "risk": "Point d'attention/risque en 1 phrase, ou null.",
  "action": "Action recommandée concrète, 1 phrase.",
  "priority": "ok"
}`

  const client = getAnthropicClient()
  const response = await client.messages.create({
    model: MODELS.fast,
    max_tokens: 700,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
  })
  const textBlock = response.content.find(b => b.type === 'text')
  if (!textBlock || textBlock.type !== 'text') return null

  let parsed: Partial<AthleteInsight>
  try { parsed = parseJsonResponse<Partial<AthleteInsight>>(textBlock.text) }
  catch {
    const m = textBlock.text.match(/\{[\s\S]*\}/)
    if (!m) return null
    try { parsed = JSON.parse(m[0]) as Partial<AthleteInsight> } catch { return null }
  }

  const prio: InsightPriority = parsed.priority === 'urgent' || parsed.priority === 'watch' ? parsed.priority : 'ok'
  return {
    headline: String(parsed.headline ?? '').slice(0, 240),
    state: String(parsed.state ?? '').slice(0, 400),
    trend: String(parsed.trend ?? '').slice(0, 300),
    risk: parsed.risk ? String(parsed.risk).slice(0, 300) : null,
    action: String(parsed.action ?? '').slice(0, 300),
    priority: prio,
    generated_at: now.toISOString(),
  }
}

/** Persiste la synthèse sur TOUS les liens coach↔athlète de cet athlète. */
export async function storeAthleteInsight(sb: SupabaseClient, athleteId: string, insight: AthleteInsight): Promise<void> {
  await sb.from('coach_athlete')
    .update({ ai_insight: insight, ai_insight_at: insight.generated_at })
    .eq('athlete_id', athleteId)
    .eq('status', 'accepted')
}
