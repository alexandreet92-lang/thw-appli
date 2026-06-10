// ══════════════════════════════════════════════════════════════════
// Progression — helpers de données (lecture seule des activités).
// Colonnes réelles : started_at, distance_m, moving_time_s, avg_hr,
// avg_watts, avg_speed_ms, avg_pace_s_km, ef_value, power_hr_ratio.
// ══════════════════════════════════════════════════════════════════

export interface ProgSession {
  id:             string
  started_at:     string
  title:          string | null
  distance_m:     number | null
  moving_time_s:  number | null
  avg_hr:         number | null
  avg_watts:      number | null
  avg_speed_ms:   number | null
  avg_pace_s_km:  number | null
  ef_value:       number | null
  power_hr_ratio: number | null
  calories:       number | null
}

export interface TrendInfo { pct: number; direction: 'up' | 'down' | 'stable'; period: string }
export interface Delta { value: string; direction: 'up' | 'down' | 'stable' }

const val = (s: ProgSession, m: keyof ProgSession): number | null => {
  const v = s[m]
  return typeof v === 'number' && isFinite(v) ? v : null
}

/** Moyenne des n séances les plus récentes ayant la métrique. null si aucune. */
export function avgRecent(sessions: ProgSession[], metric: keyof ProgSession, n = 5): number | null {
  const xs = sessions.slice(0, n).map(s => val(s, metric)).filter((v): v is number => v != null)
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null
}

/** Delta % entre les 5 récentes et les 5 précédentes. */
export function calcDelta(sessions: ProgSession[], metric: keyof ProgSession, inverse = false): Delta {
  const recent = avgRecent(sessions, metric, 5)
  const olderXs = sessions.slice(5, 10).map(s => val(s, metric)).filter((v): v is number => v != null)
  const older = olderXs.length ? olderXs.reduce((a, b) => a + b, 0) / olderXs.length : null
  if (recent == null || older == null || older === 0) return { value: '—', direction: 'stable' }
  let pct = ((recent - older) / older) * 100
  if (inverse) pct = -pct
  return {
    value: `${pct > 0 ? '+' : ''}${pct.toFixed(1)}%`,
    direction: Math.abs(pct) < 2 ? 'stable' : pct > 0 ? 'up' : 'down',
  }
}

/** Tendance (3 récentes vs 3 anciennes parmi les 8 dernières). */
export function calculateTrend(sessions: ProgSession[], metric: keyof ProgSession, inverse = false): TrendInfo {
  const got = sessions.slice(0, 8).filter(s => val(s, metric) != null)
  if (got.length < 4) return { pct: 0, direction: 'stable', period: '—' }
  const recent = got.slice(0, 3), old = got.slice(-3)
  const avg = (arr: ProgSession[]) => arr.reduce((a, s) => a + (val(s, metric) as number), 0) / arr.length
  const ra = avg(recent), oa = avg(old)
  let pct = oa !== 0 ? ((ra - oa) / oa) * 100 : 0
  if (inverse) pct = -pct
  const weeks = Math.max(1, Math.round((new Date(recent[0].started_at).getTime() - new Date(old[old.length - 1].started_at).getTime()) / 6.048e8))
  return { pct: Math.abs(pct), direction: pct > 2 ? 'up' : pct < -2 ? 'down' : 'stable', period: `sur ${weeks} sem.` }
}

export function fmtDur(s: number | null): string {
  if (s == null || !isFinite(s)) return '—'
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60)
  if (h > 0) return `${h}h${String(m).padStart(2, '0')}`
  return `${m}:${String(Math.floor(s % 60)).padStart(2, '0')}`
}
export function fmtKm(m: number | null): string {
  return m == null ? '—' : `${(m / 1000).toFixed(1).replace('.', ',')} km`
}
export function fmtRelDate(iso: string): string {
  const d = new Date(iso), now = new Date()
  const days = Math.round((now.getTime() - d.getTime()) / 8.64e7)
  if (days <= 0) return "aujourd'hui"
  if (days === 1) return 'hier'
  if (days < 7) return `il y a ${days} j`
  if (days < 35) return `il y a ${Math.round(days / 7)} sem.`
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
}
