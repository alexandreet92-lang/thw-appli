// SM/SN cyclisme. Puissance si dispo (NP/FTP), sinon FC seule. Fallbacks propres.
import { type ActivityMetricsInput, type AthleteBenchmarks, type SmSn, r, durMin, distKm, fcRel, kHeat, minutesAbove } from './smSnTypes'

export function cyclingSmSn(a: ActivityMetricsInput, p: AthleteBenchmarks): SmSn {
  const min = durMin(a.durationS)
  const durS = a.durationS ?? 0
  const ftp = a.ftpAtTime ?? p.ftp
  const dKm = distKm(a.distanceM)
  const dPlus = a.dPlusM ?? 0
  const dMinus = a.dMinusM ?? 0
  const elevSm = dKm > 0 ? dPlus / dKm / 10 : 0
  const kh = kHeat(a.tempC)
  const rel = fcRel(a.avgHr, p.hrRest, p.hrMax)

  // ── Puissance disponible ──
  if (a.np != null && a.np > 0 && ftp != null && ftp > 0) {
    const IF = a.np / ftp
    const sm = (durS * a.np * IF) / (ftp * 3600) * 100 * kh * (1 + elevSm)
    if (p.p5s != null && p.p5s > 0 && a.wattsStream && a.wattsStream.length > 0) {
      const minAbove = minutesAbove(a.wattsStream, 1.2 * ftp)
      const sn = (p.p5s / ftp) * minAbove * (1 + (dPlus + dMinus) / (dKm > 0 ? dKm * 15 : 1))
      return { sm: r(sm), sn: r(sn), smEstimated: false, snEstimated: false }
    }
    // p5s ou streams absents → SN par FC (repli)
    const sn = rel != null ? rel * min * 0.4 : 0
    return { sm: r(sm), sn: r(sn), smEstimated: false, snEstimated: true }
  }

  // ── FC seule ──
  if (rel != null) {
    const sm = min * rel * Math.exp(1.92 * rel) * kh * (1 + elevSm)
    const sn = rel * min * 0.4
    return { sm: r(sm), sn: r(sn), smEstimated: false, snEstimated: false }
  }

  // ── Ni puissance ni FC → fallback minimal estimé ──
  return { sm: r(min * 0.5), sn: 0, smEstimated: true, snEstimated: true }
}
