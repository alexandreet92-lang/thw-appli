// Calculs dérivés (lecture seule) pour la page Blessures. Aucune donnée inventée.
import type { Injury, InjuryLog, Phase } from './types'

const DAY = 86400000
const t = (d: string) => new Date(d + (d.length === 10 ? 'T00:00:00' : '')).getTime()

// ── Suivi d'évolution (courbe de douleur) ────────────────────────────────
/** Logs d'une blessure triés du + ancien au + récent, avec au moins une valeur. */
export function sortedLogs(logs: InjuryLog[], injuryId: string): InjuryLog[] {
  return logs
    .filter(l => l.injury_id === injuryId && (l.intensity_rest != null || l.intensity_effort != null))
    .slice()
    .sort((a, b) => a.log_date.localeCompare(b.log_date))
}

export type TrendDir = 'down' | 'flat' | 'up'
export interface PainTrend { dir: TrendDir; delta: number; from: number; to: number }
/** Tendance de la douleur À L'EFFORT : dernière valeur vs une référence ~7 j avant.
 *  « down » = en amélioration (douleur qui baisse). null si < 2 points. */
export function painTrend(logs: InjuryLog[], injuryId: string): PainTrend | null {
  const pts = sortedLogs(logs, injuryId).filter(l => l.intensity_effort != null)
  if (pts.length < 2) return null
  const to = pts[pts.length - 1].intensity_effort as number
  const lastT = t(pts[pts.length - 1].log_date)
  let ref = pts[0]
  for (const p of pts) { if (t(p.log_date) <= lastT - 5 * DAY) ref = p }
  const from = ref.intensity_effort as number
  const delta = to - from
  const dir: TrendDir = delta <= -1 ? 'down' : delta >= 1 ? 'up' : 'flat'
  return { dir, delta, from, to }
}

/** Adhérence rééducation : exos cochés / total (null si aucun exo). */
export function rehabAdherence(inj: Injury): { done: number; total: number } | null {
  if (!inj.rehab.length) return null
  return { done: inj.rehab.filter(x => x.done).length, total: inj.rehab.length }
}

export function daysSince(date: string): number {
  return Math.max(0, Math.floor((Date.now() - t(date)) / DAY))
}

export function durationDays(inj: Injury): number {
  const end = inj.resolved_date ? t(inj.resolved_date) : Date.now()
  return Math.max(1, Math.round((end - t(inj.onset_date)) / DAY))
}

const PHASE_PCT: Record<Phase, number> = { aigue: 0.2, recuperation: 0.5, reathletisation: 0.8, resolu: 1 }
export const phasePct = (p: Phase) => PHASE_PCT[p]

export interface Rank { key: string; count: number }
function rank(items: (string | null)[]): Rank[] {
  const m = new Map<string, number>()
  for (const i of items) { if (!i) continue; m.set(i, (m.get(i) ?? 0) + 1) }
  return [...m.entries()].map(([key, count]) => ({ key, count })).sort((a, b) => b.count - a.count)
}
export const zonesRanking  = (inj: Injury[]) => rank(inj.map(i => i.zone))
export const sportsRanking = (inj: Injury[]) => rank(inj.map(i => i.activity))

// Récidive : une autre blessure sur la même zone est apparue avant celle-ci.
export function isRecidive(inj: Injury, all: Injury[]): boolean {
  return all.some(o => o.id !== inj.id && o.zone === inj.zone && t(o.onset_date) < t(inj.onset_date))
}

// Disponibilité 12 mois : % des 365 derniers jours sans blessure active.
export function availability12mo(inj: Injury[]): number {
  const start = Date.now() - 365 * DAY
  const injured = new Set<number>()
  for (const i of inj) {
    const a = Math.max(t(i.onset_date), start)
    const b = i.resolved_date ? t(i.resolved_date) : Date.now()
    for (let d = a; d <= b; d += DAY) injured.add(Math.floor(d / DAY))
  }
  return Math.round((1 - injured.size / 365) * 100)
}

// Indice de risque — dérivé UNIQUEMENT de données réelles (sévérité des épisodes
// actifs, évolution, récidive, douleur à l'effort). Aucune charge inventée : le
// module charge×blessure viendra avec le hook de charge. Score → niveau.
export type RiskLevel = 'none' | 'low' | 'moderate' | 'high'
export interface Risk { level: RiskLevel; score: number; label: string; drivers: string[] }
const SEV_WEIGHT: Record<Injury['severity'], number> = { gene: 1, douleur: 2, blessure: 3 }
export function riskIndex(all: Injury[]): Risk {
  const active = all.filter(i => i.status === 'active')
  if (!active.length) return { level: 'none', score: 0, label: 'Aucun', drivers: [] }
  let score = 0
  const drivers: string[] = []
  for (const i of active) {
    score += SEV_WEIGHT[i.severity]
    if (i.evolution === 'aggrave') { score += 2; drivers.push(`${i.zone} s'aggrave`) }
    if (isRecidive(i, all)) { score += 1; drivers.push(`Récidive ${i.zone}`) }
    if ((i.intensity_effort ?? 0) >= 7) { score += 1 }
  }
  if (active.length >= 2) { score += 1; drivers.push(`${active.length} épisodes actifs`) }
  const level: RiskLevel = score >= 7 ? 'high' : score >= 4 ? 'moderate' : 'low'
  const label = level === 'high' ? 'Élevé' : level === 'moderate' ? 'Modéré' : 'Faible'
  return { level, score, label, drivers: [...new Set(drivers)].slice(0, 3) }
}

// Progression vers le retour au sport (return-to-play) : % du chemin onset→retour
// estimé et jours restants. null si pas d'estimation.
export interface ReturnProgress { pct: number; daysLeft: number; overdue: boolean }
export function returnProgress(inj: Injury): ReturnProgress | null {
  if (!inj.return_estimate_date || inj.status === 'resolved') return null
  const start = t(inj.onset_date), end = t(inj.return_estimate_date), now = Date.now()
  if (end <= start) return null
  const pct = Math.max(0, Math.min(1, (now - start) / (end - start)))
  const daysLeft = Math.ceil((end - now) / DAY)
  return { pct, daysLeft: Math.abs(daysLeft), overdue: daysLeft < 0 }
}

// ══════════════════════════════════════════════════════════════════
// Analytics spécifiques blessures (onglet Analyse). Lecture seule, null-safe,
// aucune donnée inventée : tout est dérivé des épisodes et des logs réels.
// ══════════════════════════════════════════════════════════════════

// ── Région canonique d'une zone (texte libre → région + regroupement) ──
const REGION_RULES: [RegExp, string][] = [
  [/achille/i, 'Achille'],
  [/dos|lombaire|rachis|colonne|lombes/i, 'Dos'],
  [/genou|rotule|ménisque|menisque/i, 'Genou'],
  [/cheville/i, 'Cheville'],
  [/pied|plantaire|orteil|aponévrose|aponevrose/i, 'Pied'],
  [/[ée]paule|coiffe|deltoïde|deltoide/i, 'Épaule'],
  [/cuisse|ischio|quadri|adducteur/i, 'Cuisse'],
  [/mollet|jumeau|soléaire|soleaire/i, 'Mollet'],
  [/hanche|psoas|fessier|bassin/i, 'Hanche'],
  [/coude|poignet|main|avant-bras|avant bras/i, 'Bras'],
  [/cou|nuque|cervical/i, 'Cou'],
  [/abdo|core|gainage|oblique|tronc/i, 'Tronc'],
]
export function regionOf(zone: string): string {
  for (const [re, name] of REGION_RULES) if (re.test(zone)) return name
  return zone
}

// ── B. Temps de guérison par regroupement (structure / sévérité) ──
export interface HealingRow { key: string; count: number; avgDays: number }
function healingBy(inj: Injury[], keyOf: (i: Injury) => string | null): HealingRow[] {
  const resolved = inj.filter(i => i.status === 'resolved')
  const m = new Map<string, number[]>()
  for (const i of resolved) {
    const k = keyOf(i); if (!k) continue
    const arr = m.get(k) ?? []; arr.push(durationDays(i)); m.set(k, arr)
  }
  return [...m.entries()]
    .map(([key, days]) => ({ key, count: days.length, avgDays: Math.round(days.reduce((a, b) => a + b, 0) / days.length) }))
    .sort((a, b) => b.count - a.count || b.avgDays - a.avgDays)
}
export const healingByStructure = (inj: Injury[]) => healingBy(inj, i => i.structure && i.structure !== 'inconnu' ? i.structure : null)
export const healingBySeverity  = (inj: Injury[]) => healingBy(inj, i => i.severity)

// ── C. Zones chroniques / récidive ──
export type ChronicStatus = 'chronic' | 'watch' | 'ok'
export interface ChronicZone { zone: string; count: number; avgIntervalDays: number | null; status: ChronicStatus; lastActive: boolean }
export function chronicZones(inj: Injury[]): ChronicZone[] {
  const m = new Map<string, Injury[]>()
  for (const i of inj) { const r = regionOf(i.zone); const arr = m.get(r) ?? []; arr.push(i); m.set(r, arr) }
  const out: ChronicZone[] = []
  for (const [zone, list] of m.entries()) {
    const onsets = list.map(i => t(i.onset_date)).sort((a, b) => a - b)
    let avgInterval: number | null = null
    if (onsets.length >= 2) {
      let sum = 0; for (let k = 1; k < onsets.length; k++) sum += onsets[k] - onsets[k - 1]
      avgInterval = Math.round(sum / (onsets.length - 1) / DAY)
    }
    const status: ChronicStatus = list.length >= 3 ? 'chronic' : list.length === 2 ? 'watch' : 'ok'
    out.push({ zone, count: list.length, avgIntervalDays: avgInterval, status, lastActive: list.some(i => i.status === 'active') })
  }
  return out.sort((a, b) => b.count - a.count)
}

// ── D. Disponibilité par mois (12 derniers) + jours perdus ──
export interface MonthAvail { ym: string; monthIdx: number; pct: number }
export interface AvailabilitySeries { months: MonthAvail[]; daysLost: number }
export function availabilityByMonth(inj: Injury[], monthsBack = 12): AvailabilitySeries {
  const now = new Date()
  const months: MonthAvail[] = []
  const injuredDays = new Set<number>()
  // Pré-calcule les jours blessés (bornés à la fenêtre) pour les jours perdus.
  const winStart = new Date(now.getFullYear(), now.getMonth() - (monthsBack - 1), 1).getTime()
  for (let k = monthsBack - 1; k >= 0; k--) {
    const d = new Date(now.getFullYear(), now.getMonth() - k, 1)
    const start = d.getTime()
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 1).getTime()
    const totalDays = Math.round((end - start) / DAY)
    const injured = new Set<number>()
    for (const i of inj) {
      const a = Math.max(t(i.onset_date), start)
      const b = Math.min(i.resolved_date ? t(i.resolved_date) : now.getTime(), end - DAY)
      for (let x = a; x <= b; x += DAY) { const day = Math.floor(x / DAY); injured.add(day); if (x >= winStart) injuredDays.add(day) }
    }
    const cap = start > now.getTime() ? 0 : Math.min(totalDays, Math.round((Math.min(end, now.getTime() + DAY) - start) / DAY))
    const pct = cap > 0 ? Math.round((1 - injured.size / cap) * 100) : 100
    months.push({ ym: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`, monthIdx: d.getMonth(), pct: Math.max(0, Math.min(100, pct)) })
  }
  return { months, daysLost: injuredDays.size }
}

// ── E. Précision du retour (estimé vs réel) ──
export interface ReturnAccRow { zone: string; estDays: number; realDays: number; delta: number }
export interface ReturnAccuracy { rows: ReturnAccRow[]; meanBias: number | null }
export function returnAccuracy(inj: Injury[]): ReturnAccuracy {
  const rows: ReturnAccRow[] = []
  for (const i of inj) {
    if (i.status !== 'resolved' || !i.return_estimate_date || !i.resolved_date) continue
    const estDays = Math.round((t(i.return_estimate_date) - t(i.onset_date)) / DAY)
    const realDays = Math.round((t(i.resolved_date) - t(i.onset_date)) / DAY)
    if (estDays <= 0) continue
    rows.push({ zone: i.zone, estDays, realDays, delta: realDays - estDays })
  }
  const meanBias = rows.length ? Math.round(rows.reduce((a, r) => a + r.delta, 0) / rows.length) : null
  return { rows: rows.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta)), meanBias }
}

// ── F. Profil de fragilité (par région, score de risque) ──
export interface FragilityAxis { region: string; score: number }
const SEV_W: Record<Injury['severity'], number> = { gene: 1, douleur: 2, blessure: 3 }
export function fragilityProfile(inj: Injury[], maxAxes = 6): FragilityAxis[] {
  const m = new Map<string, number>()
  for (const i of inj) {
    const r = regionOf(i.zone)
    let s = SEV_W[i.severity]
    if (i.status === 'active') s *= 1.5
    if (i.evolution === 'aggrave') s += 1
    m.set(r, (m.get(r) ?? 0) + s)
  }
  const raw = [...m.entries()].map(([region, v]) => ({ region, v })).sort((a, b) => b.v - a.v).slice(0, maxAxes)
  const max = Math.max(...raw.map(r => r.v), 1)
  return raw.map(r => ({ region: r.region, score: Math.round((r.v / max) * 100) }))
}

// ── G. Saisonnalité (matrice années × mois, par onset) ──
export interface Seasonality { years: number[]; matrix: number[][]; byMonth: number[] }
export function seasonality(inj: Injury[], yearsBack = 3): Seasonality {
  const cur = new Date().getFullYear()
  const years = Array.from({ length: yearsBack }, (_, k) => cur - (yearsBack - 1) + k)
  const matrix = years.map(() => new Array(12).fill(0))
  const byMonth = new Array(12).fill(0)
  for (const i of inj) {
    const d = new Date(i.onset_date + (i.onset_date.length === 10 ? 'T00:00:00' : ''))
    const yi = years.indexOf(d.getFullYear())
    byMonth[d.getMonth()]++
    if (yi >= 0) matrix[yi][d.getMonth()]++
  }
  return { years, matrix, byMonth }
}

// ── H. Alertes prévention (récidive chronique + douleur qui remonte) ──
export interface Alert { level: 'high' | 'mid'; text: string }
export function preventionAlerts(inj: Injury[], logs: InjuryLog[]): Alert[] {
  const out: Alert[] = []
  for (const z of chronicZones(inj)) {
    if (z.status === 'chronic') out.push({ level: 'high', text: `${z.zone} — ${z.count}ᵉ récidive${z.avgIntervalDays ? ` (~${Math.round(z.avgIntervalDays / 30)} mois d'intervalle)` : ''}. Renfort ciblé conseillé.` })
  }
  for (const i of inj.filter(x => x.status === 'active')) {
    const tr = painTrend(logs, i.id)
    if (tr && tr.dir === 'up') out.push({ level: 'mid', text: `${i.zone} — douleur à l'effort en hausse (+${tr.delta}).` })
    else if (i.evolution === 'aggrave') out.push({ level: 'mid', text: `${i.zone} — épisode marqué « s'aggrave ».` })
  }
  return out.slice(0, 4)
}

// ── I. Mécanisme (soudaine vs progressive) ──
export interface MechanismSplit { soudaine: number; progressive: number; total: number }
export function mechanismSplit(inj: Injury[]): MechanismSplit {
  let s = 0, p = 0
  for (const i of inj) { if (i.mechanism === 'soudaine') s++; else if (i.mechanism === 'progressive') p++ }
  return { soudaine: s, progressive: p, total: s + p }
}

// ── J. Courbe de douleur type (moyenne normalisée sur le cycle) ──
export interface PainCurve { effort: number[]; rest: number[]; buckets: number }
export function aggregatePainCurve(inj: Injury[], logs: InjuryLog[], buckets = 11): PainCurve | null {
  const effAcc = new Array(buckets).fill(0), effCnt = new Array(buckets).fill(0)
  const resAcc = new Array(buckets).fill(0), resCnt = new Array(buckets).fill(0)
  let used = 0
  for (const i of inj) {
    const pts = sortedLogs(logs, i.id)
    if (pts.length < 2) continue
    const start = t(i.onset_date)
    const end = t(pts[pts.length - 1].log_date)
    if (end <= start) continue
    used++
    for (const l of pts) {
      const x = Math.max(0, Math.min(1, (t(l.log_date) - start) / (end - start)))
      const b = Math.round(x * (buckets - 1))
      if (l.intensity_effort != null) { effAcc[b] += l.intensity_effort; effCnt[b]++ }
      if (l.intensity_rest != null) { resAcc[b] += l.intensity_rest; resCnt[b]++ }
    }
  }
  if (used === 0) return null
  const fill = (acc: number[], cnt: number[]) => {
    const out = acc.map((a, k) => cnt[k] ? a / cnt[k] : NaN)
    // report avant/arrière pour combler les trous
    let last = NaN
    for (let k = 0; k < out.length; k++) { if (!isNaN(out[k])) last = out[k]; else if (!isNaN(last)) out[k] = last }
    last = NaN
    for (let k = out.length - 1; k >= 0; k--) { if (!isNaN(out[k])) last = out[k]; else if (!isNaN(last)) out[k] = last }
    return out.map(v => isNaN(v) ? 0 : Math.round(v * 10) / 10)
  }
  return { effort: fill(effAcc, effCnt), rest: fill(resAcc, resCnt), buckets }
}

// ── K. Adhérence rééduc → guérison ──
export interface AdherenceRow { zone: string; adherence: number; days: number; severity: Injury['severity'] }
export function adherenceVsHealing(inj: Injury[]): AdherenceRow[] {
  return inj
    .filter(i => i.rehab.length > 0)
    .map(i => ({ zone: i.zone, adherence: Math.round((i.rehab.filter(x => x.done).length / i.rehab.length) * 100), days: durationDays(i), severity: i.severity }))
    .sort((a, b) => b.adherence - a.adherence)
}

export interface Stats12 { count: number; avgDuration: number | null; recidiveRate: number | null; avgReturn: number | null }
export function stats12mo(inj: Injury[]): Stats12 {
  const start = Date.now() - 365 * DAY
  const recent = inj.filter(i => t(i.onset_date) >= start)
  const resolved = recent.filter(i => i.status === 'resolved')
  const avg = (a: number[]) => a.length ? Math.round(a.reduce((x, y) => x + y, 0) / a.length) : null
  const recid = recent.filter(i => isRecidive(i, inj)).length
  return {
    count: recent.length,
    avgDuration: avg(recent.map(durationDays)),
    recidiveRate: recent.length ? Math.round((recid / recent.length) * 100) : null,
    avgReturn: avg(resolved.map(durationDays)),
  }
}
