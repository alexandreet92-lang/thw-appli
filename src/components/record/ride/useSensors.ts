'use client'
// Pont React ↔ SensorSource. Résout la source au runtime, expose connect/
// disconnect par type de capteur, les statuts (pour les pastilles) et une réf
// `live` avec les dernières valeurs (lue à 1 Hz par le moteur, sans re-render à
// chaque notification BLE).
import { useCallback, useEffect, useRef, useState } from 'react'
import { resolveSensorSource, type SensorSource, type SensorDevice, type SensorKind } from './sensors'

export type { SensorKind } from './sensors'
export type SensorStatus = 'idle' | 'connecting' | 'connected' | 'error'
export interface LiveValues { power: number | null; cadence: number | null; heartRate: number | null }

const KINDS: SensorKind[] = ['trainer', 'hr', 'cadence']

export function useSensors() {
  const [available, setAvailable] = useState<boolean | null>(null)
  const [status, setStatus] = useState<Record<SensorKind, SensorStatus>>({ trainer: 'idle', hr: 'idle', cadence: 'idle' })
  const live = useRef<LiveValues>({ power: null, cadence: null, heartRate: null })
  const source = useRef<SensorSource | null>(null)
  const devices = useRef<Map<SensorKind, SensorDevice>>(new Map())

  useEffect(() => {
    let unsub = () => {}
    void (async () => {
      const src = await resolveSensorSource()
      source.current = src
      setAvailable(await src.isAvailable())
      unsub = src.subscribe(s => {
        if (s.power != null) live.current.power = s.power
        if (s.cadence != null) live.current.cadence = s.cadence
        if (s.heartRate != null) live.current.heartRate = s.heartRate
      })
    })()
    return () => {
      unsub()
      for (const d of devices.current.values()) { void source.current?.disconnect(d) }
      devices.current.clear()
    }
  }, [])

  const setStat = (k: SensorKind, v: SensorStatus) => setStatus(p => ({ ...p, [k]: v }))

  const connect = useCallback(async (kind: SensorKind) => {
    const src = source.current
    if (!src) return
    setStat(kind, 'connecting')
    try {
      const d = await src.connect(kind)
      devices.current.set(kind, d)
      setStat(kind, 'connected')
    } catch { setStat(kind, 'error') }
  }, [])

  const disconnect = useCallback(async (kind: SensorKind) => {
    const d = devices.current.get(kind)
    if (d) { await source.current?.disconnect(d); devices.current.delete(kind) }
    if (kind === 'trainer') { live.current.power = null; live.current.cadence = null }
    if (kind === 'cadence') live.current.cadence = null
    if (kind === 'hr') live.current.heartRate = null
    setStat(kind, 'idle')
  }, [])

  const anyConnected = KINDS.some(k => status[k] === 'connected')

  return { available, status, live, connect, disconnect, anyConnected }
}
