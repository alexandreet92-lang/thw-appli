// ── Recovery page — Types & helpers partagés ──────────────────

export interface CheckInRow {
  id: string; user_id: string; date: string
  fatigue: number; energy: number; stress: number
  motivation: number; pain: number
  pain_location?: string | null
  sleep_quality: number; sleep_hours?: number | null
  notes?: string | null; created_at: string
}

export interface ActivityRow {
  id: string; sport_type: string | null
  started_at: string
  moving_time_s: number | null; elapsed_time_s: number | null
  load?: number | null
}

export interface PmcPoint {
  date: string; tss: number; ctl: number; atl: number; tsb: number
}

export interface WeekVolume {
  weekStart: string
  sports: { sport: string; seconds: number }[]
  total: number
}

export interface BodyWeightRow {
  id: string; date: string; weight_kg: number
}
export interface HydrationRow {
  id: string; date: string; liters: number
}
export interface PainLogRow {
  id: string; date: string; body_zone: string; intensity: number
}

// ── Helpers ──────────────────────────────────────────────────

/** Formate des secondes en "42min", "1h30", "3h20" */
export function fmtSec(s: number): string {
  if (s <= 0) return '0min'
  const h = Math.floor(s / 3600)
  const m = Math.round((s % 3600) / 60)
  if (h === 0) return `${m}min`
  if (m === 0) return `${h}h`
  return `${h}h${String(m).padStart(2, '0')}`
}

/** Formate des heures décimales en "1h30", "42min" */
export function fmtHours(h: number | null | undefined): string {
  if (!h || h <= 0) return '—'
  const hh = Math.floor(h)
  const mm = Math.round((h - hh) * 60)
  if (hh === 0) return `${mm}min`
  if (mm === 0) return `${hh}h`
  return `${hh}h${String(mm).padStart(2, '0')}`
}

export function localToday(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

export function calcScore(c: Pick<CheckInRow, 'fatigue'|'energy'|'stress'|'motivation'|'pain'|'sleep_quality'>): number {
  const raw =
    (10 - c.fatigue) * 15 + c.energy * 15 + (10 - c.stress) * 15 +
    c.motivation * 10 + (10 - c.pain) * 15 + c.sleep_quality * 15
  return Math.min(100, Math.round((raw / 805) * 100))
}

export interface ScoreStatus { label: string; color: string; bg: string; desc: string }

export function scoreStatus(score: number): ScoreStatus {
  if (score >= 91) return { label:'Excellent', color:'#16a34a', bg:'rgba(22,163,74,0.12)',  desc:'Forme optimale. Séance intensive possible.' }
  if (score >= 81) return { label:'Bon',       color:'#22c55e', bg:'rgba(34,197,94,0.12)',  desc:'Bonne récupération. Entraîne-toi pleinement.' }
  if (score >= 61) return { label:'Correct',   color:'#3B8FD4', bg:'rgba(59,143,212,0.12)', desc:'Récupération correcte. Intensité modérée.' }
  if (score >= 41) return { label:'Moyen',     color:'#f97316', bg:'rgba(249,115,22,0.12)', desc:'Récupération partielle. Séance légère conseillée.' }
  return              { label:'Faible',    color:'#ef4444', bg:'rgba(239,68,68,0.12)',  desc:'Corps fatigué. Repos actif recommandé.' }
}

export function metricDotColor(v: number, inverted = false): string {
  const s = inverted ? 11 - v : v
  if (s >= 8) return '#10B981'
  if (s >= 5) return '#f97316'
  return '#ef4444'
}

/** TSS approximé depuis une activité Strava */
export function estimateTss(row: ActivityRow): number {
  if (row.load != null && row.load > 0) return row.load
  const secs = row.moving_time_s ?? row.elapsed_time_s ?? 0
  const hours = secs / 3600
  const sport = (row.sport_type ?? '').toLowerCase()
  const IF = sport.includes('run') ? 0.85
    : sport.includes('rid') || sport.includes('cycl') ? 0.80
    : sport.includes('swim') ? 0.90
    : sport.includes('hyrox') ? 1.0
    : 0.70
  return Math.round(hours * IF * IF * 100)
}

/** Sport color */
export const SPORT_COLORS: Record<string, string> = {
  run:'#f97316', running:'#f97316',
  bike:'#3b82f6', cycling:'#3b82f6', ride:'#3b82f6', virtualride:'#3b82f6',
  swim:'#06b6d4', swimming:'#06b6d4',
  gym:'#8b5cf6', weighttraining:'#8b5cf6', workout:'#8b5cf6',
  hyrox:'#ef4444', rowing:'#14b8a6',
}
export function sportColor(s: string): string { return SPORT_COLORS[s.toLowerCase()] ?? '#6b7280' }
export function sportLabel(s: string): string {
  const m: Record<string,string> = {
    run:'Course', running:'Course', ride:'Vélo', virtualride:'Vélo',
    cycling:'Vélo', bike:'Vélo', swim:'Natation', swimming:'Natation',
    gym:'Gym', weighttraining:'Gym', hyrox:'Hyrox', rowing:'Aviron',
  }
  return m[s.toLowerCase()] ?? s
}
