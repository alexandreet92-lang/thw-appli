'use client'
import { useCallback, useEffect, useRef, useState } from 'react'

export type SkiPhase = 'run' | 'lift' | 'pause'

export interface SkiStats {
  phase: SkiPhase
  runCount: number
  currentRunSec: number
  totalRunSec: number
  totalLiftSec: number
  totalRunDistanceM: number
  avgSpeedRunKmh: number
  maxSpeedRunKmh: number
  elevationLossM: number
  maxAltitudeM: number
}

export function detectPhase(speedKmh: number, gradientPct: number): SkiPhase {
  if (speedKmh < 2) return 'pause'
  if (gradientPct > 5 && speedKmh < 25) return 'lift'
  if (speedKmh > 10 || gradientPct < -3) return 'run'
  return 'pause'
}

const INIT: SkiStats = {
  phase: 'pause', runCount: 0, currentRunSec: 0, totalRunSec: 0,
  totalLiftSec: 0, totalRunDistanceM: 0, avgSpeedRunKmh: 0,
  maxSpeedRunKmh: 0, elevationLossM: 0, maxAltitudeM: 0,
}

export function useSkiTracking(isActive: boolean) {
  const [stats, setStats] = useState<SkiStats>(INIT)
  const phaseRef = useRef<SkiPhase>('pause')
  const runStartDistRef = useRef(0)
  const prevAltRef = useRef<number | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (!isActive) {
      if (intervalRef.current) clearInterval(intervalRef.current)
      return
    }
    intervalRef.current = setInterval(() => {
      setStats(s => {
        if (phaseRef.current === 'run')  return { ...s, currentRunSec: s.currentRunSec + 1 }
        if (phaseRef.current === 'lift') return { ...s, totalLiftSec: s.totalLiftSec + 1 }
        return s
      })
    }, 1000)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [isActive])

  const update = useCallback((speedKmh: number, gradientPct: number, distanceM: number, altitudeM: number) => {
    const newPhase = detectPhase(speedKmh, gradientPct)
    const prevPhase = phaseRef.current

    setStats(s => {
      let next = { ...s, phase: newPhase }

      // Altitude / D-
      if (prevAltRef.current != null) {
        const diff = altitudeM - prevAltRef.current
        if (diff < -0.3) next.elevationLossM = s.elevationLossM + Math.abs(diff)
      }
      prevAltRef.current = altitudeM
      next.maxAltitudeM = Math.max(s.maxAltitudeM, altitudeM)

      if (newPhase !== prevPhase) {
        if ((prevPhase === 'lift' || prevPhase === 'pause') && newPhase === 'run') {
          runStartDistRef.current = distanceM
          next.runCount = s.runCount + 1
          next.currentRunSec = 0
        } else if (prevPhase === 'run' && newPhase !== 'run') {
          const runDist = distanceM - runStartDistRef.current
          next.totalRunDistanceM = s.totalRunDistanceM + runDist
          next.totalRunSec = s.totalRunSec + s.currentRunSec
          const totalSec = next.totalRunSec
          const totalKm = next.totalRunDistanceM / 1000
          next.avgSpeedRunKmh = totalSec > 0 ? parseFloat(((totalKm / totalSec) * 3600).toFixed(1)) : 0
        }
        phaseRef.current = newPhase
      }

      if (newPhase === 'run') next.maxSpeedRunKmh = Math.max(s.maxSpeedRunKmh, speedKmh)
      return next
    })
  }, [])

  const reset = useCallback(() => {
    setStats(INIT)
    phaseRef.current = 'pause'
    runStartDistRef.current = 0
    prevAltRef.current = null
  }, [])

  return { stats, update, reset }
}
