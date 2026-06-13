// SM/SN natation / aviron / muscu / hyrox / autres. Fallbacks propres (jamais inventer).
import { type ActivityMetricsInput, type AthleteBenchmarks, type SmSn, r, durMin, fcRel } from './smSnTypes'
import { runningSmSn } from './smSnRunning'

// SM cardio générique (FC) commun natation/aviron/hyrox/autres.
function cardioSm(a: ActivityMetricsInput, p: AthleteBenchmarks): { sm: number; estimated: boolean } {
  const min = durMin(a.durationS)
  const rel = fcRel(a.avgHr, p.hrRest, p.hrMax)
  if (rel == null) return { sm: r(min * 0.5), estimated: true }
  return { sm: r(min * rel * Math.exp(1.92 * rel)), estimated: false }
}

export function swimSmSn(a: ActivityMetricsInput, p: AthleteBenchmarks): SmSn {
  const { sm, estimated } = cardioSm(a, p)
  return { sm, sn: 0, smEstimated: estimated, snEstimated: false }
}

export function rowingSmSn(a: ActivityMetricsInput, p: AthleteBenchmarks): SmSn {
  const { sm, estimated } = cardioSm(a, p)
  const rel = fcRel(a.avgHr, p.hrRest, p.hrMax)
  const sn = rel != null ? rel * durMin(a.durationS) * 0.3 : 0
  return { sm, sn: r(sn), smEstimated: estimated, snEstimated: rel == null }
}

// SN muscu : Σ (poids × reps / 1RM) × sets × 10. 1RM ou sets absents → 0 (signalé).
export function muscuSmSn(a: ActivityMetricsInput, p: AthleteBenchmarks): SmSn {
  const min = durMin(a.durationS)
  const rel = fcRel(a.avgHr, p.hrRest, p.hrMax)
  const sm = rel != null ? rel * min * 0.6 : min * 0.5
  if (!a.strengthSets || a.strengthSets.length === 0 || !p.oneRm) {
    return { sm: r(sm), sn: 0, smEstimated: rel == null, snEstimated: true }
  }
  let sn = 0
  for (const s of a.strengthSets) {
    const orm = p.oneRm[s.exercise]
    if (orm && orm > 0) sn += (s.weightKg * s.reps / orm) * s.sets * 10
  }
  return { sm: r(sm), sn: r(sn), smEstimated: rel == null, snEstimated: false }
}

export function hyroxSmSn(a: ActivityMetricsInput, p: AthleteBenchmarks): SmSn {
  const { sm, estimated } = cardioSm(a, p)
  // Pas de segmentation run/muscu dans l'activité → SN approximé via composante course.
  const run = runningSmSn(a, p)
  return { sm, sn: r(run.sn), smEstimated: estimated, snEstimated: true }
}

export function genericSmSn(a: ActivityMetricsInput, p: AthleteBenchmarks): SmSn {
  const { sm, estimated } = cardioSm(a, p)
  return { sm, sn: 0, smEstimated: estimated, snEstimated: true }
}
