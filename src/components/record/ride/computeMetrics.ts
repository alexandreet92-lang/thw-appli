// Calculs de métriques temps réel, purs. La puissance AFFICHÉE est lissée 3 s
// (la brute saute de ±40 W). NP = moyenne d'ordre 4 ; IF = NP / FTP.
import type { RideSample, RideMetrics } from './types'

export interface Aggregates {
  sumP: number; nP: number
  sumHr: number; nHr: number
  sumCad: number; nCad: number
  maxHr: number
  kj: number
  np4Sum: number; np4N: number
}

export function emptyAggregates(): Aggregates {
  return { sumP: 0, nP: 0, sumHr: 0, nHr: 0, sumCad: 0, nCad: 0, maxHr: 0, kj: 0, np4Sum: 0, np4N: 0 }
}

/** Moyenne des N dernières puissances non nulles (lissage d'affichage). */
export function smoothedPower(samples: RideSample[], windowS = 3): number {
  let sum = 0, n = 0
  for (let i = samples.length - 1; i >= 0 && n < windowS; i--) {
    const p = samples[i].power
    if (p != null) { sum += p; n++ }
  }
  return n ? Math.round(sum / n) : 0
}

export function computeMetrics(
  samples: RideSample[], agg: Aggregates, ftp: number, zoneTimeS: number,
): RideMetrics {
  const np = agg.np4N ? Math.round(Math.pow(agg.np4Sum / agg.np4N, 0.25)) : 0
  return {
    smoothW: smoothedPower(samples),
    avgW: agg.nP ? Math.round(agg.sumP / agg.nP) : 0,
    np,
    if: ftp > 0 ? np / ftp : 0,
    kj: Math.round(agg.kj),
    hrAvg: agg.nHr ? Math.round(agg.sumHr / agg.nHr) : 0,
    hrMax: Math.round(agg.maxHr),
    cadAvg: agg.nCad ? Math.round(agg.sumCad / agg.nCad) : 0,
    zoneTimeS,
  }
}
