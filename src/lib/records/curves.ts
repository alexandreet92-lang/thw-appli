// ══════════════════════════════════════════════════════════════════
// Courbes record (mean-max) calculées depuis les streams 1 Hz.
//  • Vélo : meilleure puissance moyenne sur chaque durée (Pmax → 6 h).
//  • Course : meilleur temps pour couvrir chaque distance (400 m → marathon).
// Résultat stocké dans activities.power_curve / pace_curve (jsonb) pour ne
// calculer qu'une fois. Agrégation = max/min sur toutes les activités.
// ══════════════════════════════════════════════════════════════════

// Durées puissance (secondes). 1 s ≈ Pmax.
export const POWER_DURATIONS = [1, 5, 10, 30, 60, 120, 300, 480, 600, 900, 1200, 1800, 2700, 3600, 5400, 7200, 10800, 14400, 18000, 21600] as const
export const POWER_LABELS: Record<number, string> = {
  1: 'Pmax', 5: '5″', 10: '10″', 30: '30″', 60: '1′', 120: '2′', 300: '5′', 480: '8′', 600: '10′',
  900: '15′', 1200: '20′', 1800: '30′', 2700: '45′', 3600: '1 h', 5400: '1 h 30', 7200: '2 h',
  10800: '3 h', 14400: '4 h', 18000: '5 h', 21600: '6 h',
}

// Distances course (mètres).
export const RUN_DISTANCES = [400, 1000, 1609.34, 2000, 5000, 10000, 15000, 16093.4, 20000, 21097.5, 30000, 32186.9, 42195] as const
export const RUN_LABELS: Record<number, string> = {
  400: '400 m', 1000: '1 km', 1609.34: '1 mile', 2000: '2 km', 5000: '5 km', 10000: '10 km',
  15000: '15 km', 16093.4: '10 miles', 20000: '20 km', 21097.5: 'Semi', 30000: '30 km',
  32186.9: '20 miles', 42195: 'Marathon',
}

export type Curve = Record<string, number>

/** Meilleure puissance moyenne pour chaque durée (mean-max), via somme préfixe. */
export function computePowerCurve(watts: Array<number | null>): Curve {
  const n = watts.length
  if (n < 1) return {}
  const pre = new Float64Array(n + 1)
  for (let i = 0; i < n; i++) pre[i + 1] = pre[i] + (watts[i] ?? 0)
  const out: Curve = {}
  for (const d of POWER_DURATIONS) {
    if (d > n) continue
    let best = 0
    for (let i = 0; i + d <= n; i++) {
      const avg = (pre[i + d] - pre[i]) / d
      if (avg > best) best = avg
    }
    if (best > 0) out[String(d)] = Math.round(best)
  }
  return out
}

/** Meilleur temps (s) pour couvrir chaque distance, via deux pointeurs. */
export function computePaceCurve(distance: Array<number | null>, time: Array<number | null>): Curve {
  const n = Math.min(distance.length, time.length)
  if (n < 2) return {}
  const d = distance.map(x => x ?? 0)
  const t = time.map(x => x ?? 0)
  const out: Curve = {}
  for (const target of RUN_DISTANCES) {
    let best = Infinity
    let i = 0
    for (let j = 0; j < n; j++) {
      while (i < j && d[j] - d[i + 1] >= target) i++
      if (d[j] - d[i] >= target) {
        const dt = t[j] - t[i]
        if (dt > 0 && dt < best) best = dt
      }
    }
    if (best < Infinity) out[String(target)] = Math.round(best)
  }
  return out
}

interface StreamsLike { watts?: Array<number | null>; distance?: Array<number | null>; time?: Array<number | null>; velocity?: Array<number | null> }

/** Calcule les courbes pertinentes selon le sport à partir des streams. */
export function computeCurves(streams: StreamsLike | null | undefined, sportType: string): { power_curve: Curve | null; pace_curve: Curve | null } {
  if (!streams) return { power_curve: null, pace_curve: null }
  const isBike = /bike|ride|cycl|vélo|velo/i.test(sportType)
  const isRun = /run|course|trail|marche|walk|hike|rando/i.test(sportType)
  let power_curve: Curve | null = null
  let pace_curve: Curve | null = null
  if (isBike && Array.isArray(streams.watts) && streams.watts.length > 0) {
    power_curve = computePowerCurve(streams.watts)
  }
  if ((isRun || !isBike) && Array.isArray(streams.distance) && Array.isArray(streams.time) && streams.distance.length > 1) {
    pace_curve = computePaceCurve(streams.distance, streams.time)
  }
  return { power_curve, pace_curve }
}

// ── Agrégation records ────────────────────────────────────────────
export interface RecordRow { started_at: string; sport_type: string; power_curve: Curve | null; pace_curve: Curve | null }
export interface RecordEntry { key: number; label: string; value: number; date: string }        // value = watts (power) | seconds (pace)
export interface RecordSet { allTime: RecordEntry[]; year: RecordEntry[] }

function bestBy(rows: RecordRow[], keys: readonly number[], labels: Record<number, string>, pick: (r: RecordRow) => Curve | null, better: (a: number, b: number) => boolean): RecordEntry[] {
  return keys.map(k => {
    let best: RecordEntry | null = null
    for (const r of rows) {
      const c = pick(r); if (!c) continue
      const v = c[String(k)]
      if (v == null) continue
      if (!best || better(v, best.value)) best = { key: k, label: labels[k] ?? String(k), value: v, date: r.started_at }
    }
    return best
  }).filter((e): e is RecordEntry => e != null)
}

/** Records puissance (vélo) : max watts par durée, all-time + année en cours. */
export function aggregatePowerRecords(rows: RecordRow[], year: number): RecordSet {
  const rides = rows.filter(r => r.power_curve && /bike|ride|cycl|vélo|velo/i.test(r.sport_type))
  const yearRows = rides.filter(r => new Date(r.started_at).getFullYear() === year)
  const gt = (a: number, b: number) => a > b
  return { allTime: bestBy(rides, POWER_DURATIONS, POWER_LABELS, r => r.power_curve, gt), year: bestBy(yearRows, POWER_DURATIONS, POWER_LABELS, r => r.power_curve, gt) }
}

/** Records course : min temps par distance, all-time + année en cours. */
export function aggregatePaceRecords(rows: RecordRow[], year: number): RecordSet {
  const runs = rows.filter(r => r.pace_curve && /run|course|trail/i.test(r.sport_type))
  const yearRows = runs.filter(r => new Date(r.started_at).getFullYear() === year)
  const lt = (a: number, b: number) => a < b
  return { allTime: bestBy(runs, RUN_DISTANCES, RUN_LABELS, r => r.pace_curve, lt), year: bestBy(yearRows, RUN_DISTANCES, RUN_LABELS, r => r.pace_curve, lt) }
}

export function fmtRecordTime(s: number): string {
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = Math.round(s % 60)
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
  return `${m}:${String(sec).padStart(2, '0')}`
}
