// ════════════════════════════════════════════════════════════
// SPORT-SPECIFIC METRICS — analyse objective depuis les streams
// ════════════════════════════════════════════════════════════
// Calculs factuels (courbe de puissance, profil d'allure, durabilité)
// destinés à nourrir l'IA Points faibles avec des chiffres réels
// plutôt que des impressions. Aucune dépendance externe.
//
// Règle projet : mapping streams obligatoire = r.streams ?? r.raw_data?.streams
// + null-safety systématique (backfill partiel de la colonne streams).

import type { StreamData } from '@/lib/strava/streams'

export type CanonSport = 'cycling' | 'running'

export interface ActivityWithStreams {
  id: string
  title?: string | null
  sport_type?: string | null
  started_at?: string | null
  moving_time_s?: number | null
  distance_m?: number | null
  average_heartrate?: number | null
  max_heartrate?: number | null
  avg_watts?: number | null
  average_speed?: number | null
  is_race?: boolean | null
  streams?: StreamData | null
  raw_data?: { streams?: StreamData | null } | null
}

export interface PowerCurvePoint {
  window: string
  seconds: number
  watts: number
  fromActivity: string | null
  fromDate: string | null
}

export interface PaceCurvePoint {
  window: string
  meters: number
  secPerKm: number
  speedMs: number
  fromActivity: string | null
  fromDate: string | null
}

export interface DurabilityEffort {
  title: string | null
  date: string | null
  durationMin: number
  /** Découplage cardiaque : dérive de l'efficience (ref/FC) 2e vs 1re moitié, en %. */
  decouplingPct: number | null
  /** Fade brut : variation puissance (vélo) ou vitesse (course) 2e vs 1re moitié, en %. */
  fadePct: number | null
}

export interface SportMetrics {
  sport: CanonSport
  activitiesAnalyzed: number
  withSignal: number
  /** Vélo uniquement — meilleure puissance moyenne par fenêtre, tous efforts confondus. */
  powerCurve: PowerCurvePoint[] | null
  /** Vélo — FTP estimée = 95 % du meilleur 20 min. */
  estimatedFtp: number | null
  /** Course uniquement — meilleure allure soutenue par distance. */
  paceCurve: PaceCurvePoint[] | null
  durability: {
    longEffortsCount: number
    avgDecouplingPct: number | null
    avgFadePct: number | null
    efforts: DurabilityEffort[]
  }
}

// ── Helpers ──────────────────────────────────────────────────

function avg(arr: number[]): number {
  if (arr.length === 0) return 0
  let s = 0
  for (const v of arr) s += v
  return s / arr.length
}

/** Mapping streams obligatoire + null-safety. */
function getStreams(a: ActivityWithStreams): StreamData | null {
  return a.streams ?? a.raw_data?.streams ?? null
}

export function canonOf(sportType: string | null | undefined): CanonSport | null {
  const s = (sportType ?? '').toLowerCase()
  if (/bike|cycl|ride|velo|vélo/.test(s)) return 'cycling'
  if (/run|trail|course/.test(s)) return 'running'
  return null
}

/** Mappe un label de sélection (FR) du flow Points faibles vers un sport canonique. */
export function wpLabelToCanon(label: string): CanonSport | null {
  const l = label.toLowerCase()
  if (/cycl|vélo|velo/.test(l)) return 'cycling'
  if (/run|course|trail/.test(l)) return 'running'
  return null
}

/**
 * Meilleure moyenne glissante sur une fenêtre de `windowLen` échantillons.
 * Hypothèse 1 Hz (1 échantillon/seconde) — cohérent avec le reste de l'app.
 * Prefix-sum incrémentale : O(n) par fenêtre.
 */
function bestMeanOverWindow(data: number[], windowLen: number): number {
  if (windowLen <= 0 || data.length < windowLen) return 0
  let sum = 0
  for (let i = 0; i < windowLen; i++) sum += data[i]
  let best = sum
  for (let i = windowLen; i < data.length; i++) {
    sum += data[i] - data[i - windowLen]
    if (sum > best) best = sum
  }
  return best / windowLen
}

const POWER_WINDOWS: { window: string; seconds: number }[] = [
  { window: '5 s',    seconds: 5 },
  { window: '30 s',   seconds: 30 },
  { window: '1 min',  seconds: 60 },
  { window: '5 min',  seconds: 300 },
  { window: '20 min', seconds: 1200 },
  { window: '60 min', seconds: 3600 },
]

const PACE_WINDOWS: { window: string; meters: number }[] = [
  { window: '400 m', meters: 400 },
  { window: '1 km',  meters: 1000 },
  { window: '5 km',  meters: 5000 },
  { window: '10 km', meters: 10000 },
  { window: '21 km', meters: 21097 },
]

const LONG_EFFORT_MIN_S = 5400 // 1h30

// ── Courbe de puissance (vélo) ───────────────────────────────

function buildPowerCurve(acts: ActivityWithStreams[]): { curve: PowerCurvePoint[]; ftp: number | null } {
  const best = POWER_WINDOWS.map(w => ({ ...w, watts: 0, fromActivity: null as string | null, fromDate: null as string | null }))

  for (const a of acts) {
    const watts = getStreams(a)?.watts
    if (!watts || watts.length === 0) continue
    const clean = watts.filter(v => Number.isFinite(v) && v >= 0)
    if (clean.length === 0) continue
    for (const slot of best) {
      const m = bestMeanOverWindow(clean, slot.seconds)
      if (m > slot.watts) {
        slot.watts = m
        slot.fromActivity = a.title ?? null
        slot.fromDate = a.started_at ?? null
      }
    }
  }

  const curve = best
    .filter(s => s.watts > 5)
    .map(s => ({ window: s.window, seconds: s.seconds, watts: Math.round(s.watts), fromActivity: s.fromActivity, fromDate: s.fromDate }))

  const w20 = best.find(s => s.seconds === 1200)
  const ftp = w20 && w20.watts > 5 ? Math.round(w20.watts * 0.95) : null
  return { curve: curve.length ? curve : [], ftp }
}

// ── Profil d'allure (course) ─────────────────────────────────

function buildPaceCurve(acts: ActivityWithStreams[]): PaceCurvePoint[] {
  const best = PACE_WINDOWS.map(w => ({ ...w, speedMs: 0, fromActivity: null as string | null, fromDate: null as string | null }))

  for (const a of acts) {
    const st = getStreams(a)
    const vel = st?.velocity
    const dist = st?.distance
    if (!vel || !dist || dist.length < 2) continue
    const totalDist = dist[dist.length - 1] ?? 0
    for (const slot of best) {
      if (totalDist < slot.meters) continue
      let bestSpeed = 0
      let i = 0
      for (let j = 0; j < dist.length; j++) {
        while (i < j && (dist[j] - dist[i]) > slot.meters) i++
        if ((dist[j] - dist[i]) >= slot.meters * 0.95) {
          const seg = vel.slice(i, j + 1).filter(v => v > 0 && Number.isFinite(v))
          const a2 = seg.length ? avg(seg) : 0
          if (a2 > bestSpeed) bestSpeed = a2
        }
      }
      if (bestSpeed > slot.speedMs) {
        slot.speedMs = bestSpeed
        slot.fromActivity = a.title ?? null
        slot.fromDate = a.started_at ?? null
      }
    }
  }

  return best
    .filter(s => s.speedMs > 0.5)
    .map(s => ({
      window: s.window,
      meters: s.meters,
      speedMs: Math.round(s.speedMs * 100) / 100,
      secPerKm: Math.round(1000 / s.speedMs),
      fromActivity: s.fromActivity,
      fromDate: s.fromDate,
    }))
}

// ── Durabilité (fade + découplage sur efforts longs) ─────────

function buildDurability(acts: ActivityWithStreams[], sport: CanonSport): SportMetrics['durability'] {
  const efforts: DurabilityEffort[] = []

  for (const a of acts) {
    const dur = a.moving_time_s ?? 0
    if (dur < LONG_EFFORT_MIN_S) continue
    const st = getStreams(a)
    const hr = st?.heartrate
    const ref = sport === 'cycling' ? st?.watts : st?.velocity
    if (!hr || hr.length < 40 || !ref || ref.length < 40) continue

    const hrMid = Math.floor(hr.length / 2)
    const refMid = Math.floor(ref.length / 2)
    const h1 = avg(hr.slice(0, hrMid).filter(v => v > 0))
    const h2 = avg(hr.slice(hrMid).filter(v => v > 0))
    const r1 = avg(ref.slice(0, refMid).filter(v => v > 0 && Number.isFinite(v)))
    const r2 = avg(ref.slice(refMid).filter(v => v > 0 && Number.isFinite(v)))

    const fadePct = r1 > 0 ? Math.round(((r2 - r1) / r1) * 1000) / 10 : null
    let decouplingPct: number | null = null
    if (h1 > 0 && h2 > 0 && r1 > 0 && r2 > 0) {
      const ef1 = r1 / h1
      const ef2 = r2 / h2
      decouplingPct = ef1 > 0 ? Math.round(((ef2 - ef1) / ef1) * 1000) / 10 : null
    }

    efforts.push({
      title: a.title ?? null,
      date: a.started_at ?? null,
      durationMin: Math.round(dur / 60),
      decouplingPct,
      fadePct,
    })
  }

  efforts.sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''))
  const top = efforts.slice(0, 8)

  const dec = top.map(e => e.decouplingPct).filter((v): v is number => v != null)
  const fad = top.map(e => e.fadePct).filter((v): v is number => v != null)

  return {
    longEffortsCount: efforts.length,
    avgDecouplingPct: dec.length ? Math.round(avg(dec) * 10) / 10 : null,
    avgFadePct: fad.length ? Math.round(avg(fad) * 10) / 10 : null,
    efforts: top,
  }
}

// ── Entrée principale ────────────────────────────────────────

/**
 * Calcule les métriques objectives pour un sport canonique donné,
 * à partir d'activités (avec streams). Retourne `null` si aucune
 * activité exploitable pour ce sport.
 */
export function computeSportMetrics(
  activities: ActivityWithStreams[],
  sport: CanonSport,
): SportMetrics | null {
  const acts = activities.filter(a => canonOf(a.sport_type) === sport)
  if (acts.length === 0) return null

  const withSignal = acts.filter(a => {
    const st = getStreams(a)
    return sport === 'cycling' ? !!st?.watts?.length : !!st?.velocity?.length
  }).length

  let powerCurve: PowerCurvePoint[] | null = null
  let estimatedFtp: number | null = null
  let paceCurve: PaceCurvePoint[] | null = null

  if (sport === 'cycling') {
    const pc = buildPowerCurve(acts)
    powerCurve = pc.curve.length ? pc.curve : null
    estimatedFtp = pc.ftp
  } else {
    const pace = buildPaceCurve(acts)
    paceCurve = pace.length ? pace : null
  }

  const durability = buildDurability(acts, sport)

  // Rien d'exploitable → null pour ne pas polluer le prompt
  if (!powerCurve && !paceCurve && durability.longEffortsCount === 0) return null

  return {
    sport,
    activitiesAnalyzed: acts.length,
    withSignal,
    powerCurve,
    estimatedFtp,
    paceCurve,
    durability,
  }
}

/** Formate l'allure (sec/km) en mm:ss/km pour affichage. */
export function fmtPaceSecPerKm(secPerKm: number): string {
  const m = Math.floor(secPerKm / 60)
  const s = secPerKm % 60
  return `${m}:${String(s).padStart(2, '0')}/km`
}
