'use client'
// ══════════════════════════════════════════════════════════════════
// useHeartRate — connexion à un capteur de fréquence cardiaque BLE via Web
// Bluetooth (service standard Heart Rate 0x180D, mesure 0x2A37).
// ⚠️ Web Bluetooth n'existe PAS sur iOS/Safari → `supported` sera false ;
// fonctionne sur Android/Chrome (et future app native). Aucune dépendance externe.
// Expose : bpm instant, min, max, moyenne, et un historique (courbe).
// ══════════════════════════════════════════════════════════════════
import { useCallback, useRef, useState } from 'react'

interface BleDeviceLike { gatt?: { connect: () => Promise<BleServerLike>; disconnect: () => void }; addEventListener: (t: string, cb: () => void) => void }
interface BleServerLike { getPrimaryService: (s: number) => Promise<BleServiceLike> }
interface BleServiceLike { getCharacteristic: (c: number) => Promise<BleCharLike> }
interface BleCharLike { startNotifications: () => Promise<BleCharLike>; addEventListener: (t: string, cb: (e: Event) => void) => void }

export interface HeartRateState {
  supported: boolean
  status: 'idle' | 'connecting' | 'connected' | 'error'
  bpm: number | null
  min: number | null
  max: number | null
  avg: number | null
  samples: number[]        // historique (1 point / mesure) pour la courbe
  connect: () => Promise<void>
  disconnect: () => void
}

function parseHr(dv: DataView): number {
  const flags = dv.getUint8(0)
  return (flags & 0x01) ? dv.getUint16(1, true) : dv.getUint8(1)
}

export function useHeartRate(): HeartRateState {
  const supported = typeof navigator !== 'undefined' && 'bluetooth' in navigator
  const [status, setStatus] = useState<HeartRateState['status']>('idle')
  const [bpm, setBpm] = useState<number | null>(null)
  const [min, setMin] = useState<number | null>(null)
  const [max, setMax] = useState<number | null>(null)
  const [samples, setSamples] = useState<number[]>([])
  const sumRef = useRef(0); const countRef = useRef(0)
  const deviceRef = useRef<BleDeviceLike | null>(null)

  const disconnect = useCallback(() => {
    try { deviceRef.current?.gatt?.disconnect() } catch { /* ignore */ }
    deviceRef.current = null
    setStatus('idle')
  }, [])

  const connect = useCallback(async () => {
    if (!supported) { setStatus('error'); return }
    try {
      setStatus('connecting')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const bt = (navigator as any).bluetooth
      const device: BleDeviceLike = await bt.requestDevice({ filters: [{ services: [0x180d] }] })
      deviceRef.current = device
      device.addEventListener('gattserverdisconnected', () => setStatus('idle'))
      const server = await device.gatt!.connect()
      const service = await server.getPrimaryService(0x180d)
      const ch = await service.getCharacteristic(0x2a37)
      await ch.startNotifications()
      ch.addEventListener('characteristicvaluechanged', (e: Event) => {
        const dv = (e.target as unknown as { value: DataView }).value
        const v = parseHr(dv)
        if (!v || v < 20 || v > 240) return
        setBpm(v)
        setMin(m => (m == null ? v : Math.min(m, v)))
        setMax(m => (m == null ? v : Math.max(m, v)))
        sumRef.current += v; countRef.current += 1
        setSamples(s => (s.length > 600 ? [...s.slice(-599), v] : [...s, v]))
      })
      setStatus('connected')
    } catch {
      setStatus('error')
    }
  }, [supported])

  const avg = countRef.current ? Math.round(sumRef.current / countRef.current) : null
  return { supported, status, bpm, min, max, avg, samples, connect, disconnect }
}
