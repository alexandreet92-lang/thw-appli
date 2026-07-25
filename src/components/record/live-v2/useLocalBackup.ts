'use client'
// ════════════════════════════════════════════════════════════════════
// useLocalBackup — sauvegarde locale de la séance live (PROMPT_LIVE_VELO §7).
// Snapshot périodique (10 s) pendant l'enregistrement + snapshot à l'arrêt.
// Si l'envoi échoue, l'activité reste dans localStorage ; au montage de
// l'écran record, un backup non envoyé est proposé à la reprise d'envoi.
// ════════════════════════════════════════════════════════════════════
import { useEffect, useRef } from 'react'
import type { GPSPoint } from '@/hooks/useGPSTracking'
import type { SessionLap } from '@/types/session'

export interface LiveSnapshot {
  sport: 'cycling'
  startedAtISO: string
  endedAtISO: string
  durationSec: number
  distM: number
  elevM: number
  avgSpeedKmh: number
  maxSpeedKmh: number
  calories: number
  gpsPts: GPSPoint[]
  laps: SessionLap[]
}

export interface LiveBackup {
  snap: LiveSnapshot
  savedAt: number
}

const KEY = 'thw_live_v2_backup'

export function loadLiveBackup(): LiveBackup | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as LiveBackup
    if (!parsed?.snap?.startedAtISO) return null
    return parsed
  } catch {
    return null
  }
}

export function saveLiveBackup(snap: LiveSnapshot): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(KEY, JSON.stringify({ snap, savedAt: Date.now() } satisfies LiveBackup))
  } catch {
    // localStorage plein (trace GPS longue) : on retente sans les points.
    try {
      const light: LiveSnapshot = { ...snap, gpsPts: [] }
      localStorage.setItem(KEY, JSON.stringify({ snap: light, savedAt: Date.now() } satisfies LiveBackup))
    } catch { /* stockage indisponible — tant pis */ }
  }
}

export function clearLiveBackup(): void {
  if (typeof window === 'undefined') return
  try { localStorage.removeItem(KEY) } catch { /* ignore */ }
}

/**
 * Pendant l'enregistrement (`active`), écrit un snapshot toutes les 10 s.
 * `getSnapshot` est lu via ref : toujours l'état le plus récent, sans
 * redémarrer l'intervalle à chaque render.
 */
export function useLocalBackup(active: boolean, getSnapshot: () => LiveSnapshot | null): void {
  const getRef = useRef(getSnapshot)
  getRef.current = getSnapshot

  useEffect(() => {
    if (!active) return
    const write = () => {
      const snap = getRef.current()
      if (snap) saveLiveBackup(snap)
    }
    write()
    const iv = setInterval(write, 10_000)
    return () => clearInterval(iv)
  }, [active])
}
