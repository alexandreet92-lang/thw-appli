// Vue-modèle partagée entre les écrans mobile et desktop. RideScreen calcule
// `derive(view)` une fois par rendu ; les pages consomment le résultat.
import { zoneIndex, ZONES } from './zones'
import type { RidePlan, RideBlock, RideMetrics, RideSample } from './types'

export interface RideView {
  ftp: number
  fcMax: number
  plan: RidePlan | null
  t: number
  metrics: RideMetrics
  current: RideBlock | null
  samples: RideSample[]
}

export interface Derived {
  power: number          // puissance affichée (lissée 3 s)
  targetW: number
  deltaW: number
  pct: number            // % FTP
  zone: number           // index 0-based
  zoneKey: string
  zoneName: string
  cadence: number | null
  hr: number | null
  countdownS: number     // restant sur l'intervalle
  remainingS: number     // restant sur la séance
  repLabel: string
  smEst: number          // estimation live SM (cas indoor de cyclingSmSn)
}

function lastNonNull(samples: RideSample[], key: 'cadence' | 'hr'): number | null {
  for (let i = samples.length - 1; i >= 0; i--) { const v = samples[i][key]; if (v != null) return v }
  return null
}

export function derive(v: RideView): Derived {
  const power = v.metrics.smoothW
  const targetW = v.current?.targetW ?? 0
  const zone = zoneIndex(power, v.ftp)
  return {
    power,
    targetW,
    deltaW: v.current ? power - targetW : 0,
    pct: v.ftp > 0 ? Math.round((power / v.ftp) * 100) : 0,
    zone,
    zoneKey: ZONES[zone].key,
    zoneName: ZONES[zone].name,
    cadence: lastNonNull(v.samples, 'cadence'),
    hr: lastNonNull(v.samples, 'hr'),
    countdownS: v.current ? v.current.t1 - v.t : 0,
    remainingS: v.plan ? Math.max(0, v.plan.totalS - v.t) : 0,
    repLabel: v.current?.of ? `Bloc ${v.current.rep} / ${v.current.of}` : '—',
    smEst: Math.round((v.t / 3600) * v.metrics.if * v.metrics.if * 100),
  }
}
