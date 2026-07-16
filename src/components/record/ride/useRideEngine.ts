'use client'
// Moteur de séance : chrono 1 Hz, échantillonnage des capteurs, agrégats et
// métriques. Lit la réf `live` fournie par useSensors à chaque seconde. La pause
// gèle le chrono ET l'échantillonnage (aucun sample enregistré en pause).
import { useCallback, useMemo, useRef, useState } from 'react'
import { zoneIndex } from './zones'
import { computeMetrics, emptyAggregates, type Aggregates } from './computeMetrics'
import type { LiveValues } from './useSensors'
import type { RidePlan, RideSample, RideBlock } from './types'

export function blockAt(plan: RidePlan | null, t: number): RideBlock | null {
  if (!plan) return null
  return plan.blocks.find(b => t >= b.t0 && t < b.t1) ?? plan.blocks[plan.blocks.length - 1] ?? null
}

export function useRideEngine(ftp: number, plan: RidePlan | null, live: React.RefObject<LiveValues>) {
  const [running, setRunning] = useState(false)
  const [t, setT] = useState(0)
  const samples = useRef<RideSample[]>([])
  const agg = useRef<Aggregates>(emptyAggregates())
  const zone = useRef({ last: -1, timeS: 0 })
  const timer = useRef<ReturnType<typeof setInterval> | null>(null)

  const stopTimer = () => { if (timer.current) { clearInterval(timer.current); timer.current = null } }

  const step = useCallback(() => {
    setT(prev => {
      const nt = prev + 1
      const v = live.current ?? { power: null, cadence: null, heartRate: null }
      samples.current.push({ t: nt, power: v.power, hr: v.heartRate, cadence: v.cadence })
      const a = agg.current
      if (v.power != null) { a.sumP += v.power; a.nP++; a.kj += v.power / 1000; a.np4Sum += v.power ** 4; a.np4N++ }
      if (v.heartRate != null) { a.sumHr += v.heartRate; a.nHr++; a.maxHr = Math.max(a.maxHr, v.heartRate) }
      if (v.cadence != null) { a.sumCad += v.cadence; a.nCad++ }
      if (v.power != null) {
        const z = zoneIndex(v.power, ftp)
        if (z === zone.current.last) zone.current.timeS++
        else { zone.current.last = z; zone.current.timeS = 0 }
      }
      // Fin de séance planifiée → arrêt automatique du chrono.
      if (plan && nt >= plan.totalS) { stopTimer(); setRunning(false) }
      return nt
    })
  }, [ftp, plan, live])

  const start = useCallback(() => {
    if (timer.current) return
    setRunning(true)
    timer.current = setInterval(step, 1000)
  }, [step])

  const pause = useCallback(() => { stopTimer(); setRunning(false) }, [])

  const metrics = useMemo(
    () => computeMetrics(samples.current, agg.current, ftp, zone.current.timeS),
    // recalcul à chaque seconde (t) — les agrégats vivent dans des réfs
    [t, ftp],
  )

  const current = useMemo(() => blockAt(plan, t), [plan, t])

  return { running, t, samples, metrics, current, start, pause }
}
