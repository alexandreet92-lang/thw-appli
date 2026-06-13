// SM/SN course & trail. Pente (d+) sur SM, descente (d-) sur SN, k_zone par FC relative.
import { type ActivityMetricsInput, type AthleteBenchmarks, type SmSn, r, durMin, distKm, fcRel, kHeat } from './smSnTypes'

function kZone(rel: number): number {
  if (rel < 0.6) return 1.0
  if (rel < 0.7) return 1.1
  if (rel < 0.8) return 1.3
  if (rel < 0.9) return 1.6
  return 2.0
}

export function runningSmSn(a: ActivityMetricsInput, p: AthleteBenchmarks): SmSn {
  const min = durMin(a.durationS)
  const dKm = distKm(a.distanceM)
  const dPlus = a.dPlusM ?? 0
  const dMinus = a.dMinusM ?? 0
  const kh = kHeat(a.tempC)
  const rel = fcRel(a.avgHr, p.hrRest, p.hrMax)
  const descSn = 1 + (dKm > 0 ? (dMinus / dKm) * 0.015 : 0)

  if (rel == null) {
    // FC absente → SM estimé minimal ; SN sur volume (zone neutre Z1).
    return { sm: r(min * 0.5), sn: r(min * 1.0 * descSn), smEstimated: true, snEstimated: true }
  }

  const sm = min * rel * Math.exp(1.92 * rel) * kh * (1 + (dKm > 0 ? dPlus / dKm / 8 : 0))
  const sn = min * kZone(rel) * descSn
  return { sm: r(sm), sn: r(sn), smEstimated: false, snEstimated: false }
}
