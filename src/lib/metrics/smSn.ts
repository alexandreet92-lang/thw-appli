// Dispatcher SM/SN par sport + mapper depuis une ligne `activities`. Déterministe.
import type { ActivityMetricsInput, AthleteBenchmarks, SmSn, StrengthSet } from './smSnTypes'
import { cyclingSmSn } from './smSnCycling'
import { runningSmSn } from './smSnRunning'
import { swimSmSn, rowingSmSn, muscuSmSn, hyroxSmSn, genericSmSn } from './smSnOther'

export type { ActivityMetricsInput, AthleteBenchmarks, SmSn } from './smSnTypes'

export function computeSmSn(a: ActivityMetricsInput, p: AthleteBenchmarks): SmSn {
  const s = (a.sportType ?? '').toLowerCase()
  if (s.includes('bike') || s.includes('cycl') || s.includes('ride') || s.includes('velo')) return cyclingSmSn(a, p)
  if (s.includes('run') || s.includes('trail')) return runningSmSn(a, p)
  if (s.includes('swim') || s.includes('nat')) return swimSmSn(a, p)
  if (s.includes('row') || s.includes('avir')) return rowingSmSn(a, p)
  if (s.includes('hyrox')) return hyroxSmSn(a, p)
  if (s.includes('gym') || s.includes('muscu') || s.includes('weight') || s.includes('strength')) return muscuSmSn(a, p)
  return genericSmSn(a, p)
}

// ── Mapper : ligne `activities` (DB) → entrée du moteur ──
interface ActivityRowLike {
  sport_type?: string | null
  moving_time_s?: number | null
  elapsed_time_s?: number | null
  normalized_watts?: number | null
  ftp_at_time?: number | null
  avg_hr?: number | null
  avg_temp_c?: number | null
  elevation_gain_m?: number | null
  total_descent_m?: number | null
  elevation_loss_m?: number | null
  distance_m?: number | null
  streams?: unknown
  raw_data?: unknown
  strength_sets?: StrengthSet[] | null
  // Scores stockés au moment de l'enregistrement (avec streams complets) — plus
  // fiables que le recalcul depuis une ligne allégée (streams retirés).
  sm_score?: number | null
  sn_score?: number | null
}

function wattsFrom(row: ActivityRowLike): number[] | null {
  const pick = (s: unknown): number[] | null => {
    if (!s || typeof s !== 'object') return null
    const w = (s as { watts?: unknown }).watts
    return Array.isArray(w) ? w.filter((x): x is number => typeof x === 'number') : null
  }
  return pick(row.streams) ?? pick((row.raw_data as { streams?: unknown } | null)?.streams) ?? null
}

export function activityToInput(row: ActivityRowLike): ActivityMetricsInput {
  return {
    sportType:   row.sport_type ?? null,
    durationS:   row.moving_time_s ?? row.elapsed_time_s ?? null,
    np:          row.normalized_watts ?? null,
    ftpAtTime:   row.ftp_at_time ?? null,
    avgHr:       row.avg_hr ?? null,
    tempC:       row.avg_temp_c ?? null,
    dPlusM:      row.elevation_gain_m ?? null,
    dMinusM:     row.total_descent_m ?? row.elevation_loss_m ?? null,
    distanceM:   row.distance_m ?? null,
    wattsStream: wattsFrom(row),
    strengthSets: row.strength_sets ?? null,
  }
}

export function smSnFromRow(row: ActivityRowLike, p: AthleteBenchmarks): SmSn {
  const computed = computeSmSn(activityToInput(row), p)
  // Préfère les scores stockés (calculés avec les streams complets à
  // l'enregistrement) quand ils sont renseignés et > 0 ; sinon recalcul (dont
  // les replis non nuls pour vélo/muscu). Évite un SN à 0 sur ligne allégée.
  const smStored = typeof row.sm_score === 'number' && row.sm_score > 0 ? row.sm_score : null
  const snStored = typeof row.sn_score === 'number' && row.sn_score > 0 ? row.sn_score : null
  return {
    sm: smStored ?? computed.sm,
    sn: snStored ?? computed.sn,
    smEstimated: smStored != null ? false : computed.smEstimated,
    snEstimated: snStored != null ? false : computed.snEstimated,
  }
}
