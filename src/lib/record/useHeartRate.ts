'use client'
// ══════════════════════════════════════════════════════════════════
// useHeartRate — connexion à un capteur de fréquence cardiaque BLE via Web
// Bluetooth (service standard Heart Rate 0x180D, mesure 0x2A37).
// ⚠️ Web Bluetooth n'existe PAS sur iOS/Safari → `supported` sera false ;
// fonctionne sur Android/Chrome ; app native → BLE natif via le magasin partagé.
// Expose : bpm instant, min, max, moyenne, et un historique (courbe).
// ══════════════════════════════════════════════════════════════════
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { getSensorState, subscribeSensors, connectSensor, disconnectSensor } from '@/lib/sensors/bluetooth'

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
  // App native (iOS) : pas de Web Bluetooth dans WKWebView → on lit le magasin
  // capteurs partagé (BLE natif, src/lib/sensors) : même appareil que la
  // feuille capteurs, reconnexion auto, valeurs identiques partout.
  const sensors = useSyncExternalStore(subscribeSensors, getSensorState, getSensorState)
  const native = sensors.native
  const supported = native || (typeof navigator !== 'undefined' && 'bluetooth' in navigator)
  const [status, setStatus] = useState<HeartRateState['status']>('idle')
  const [bpm, setBpm] = useState<number | null>(null)
  const [min, setMin] = useState<number | null>(null)
  const [max, setMax] = useState<number | null>(null)
  const [samples, setSamples] = useState<number[]>([])
  const sumRef = useRef(0); const countRef = useRef(0)
  const deviceRef = useRef<BleDeviceLike | null>(null)

  // Natif : chaque nouvelle mesure du magasin alimente bpm/min/max/moyenne.
  const live = sensors.hr
  useEffect(() => {
    if (!native) return
    const v = live
    if (v == null || v < 20 || v > 240) return
    setBpm(v)
    setMin(m => (m == null ? v : Math.min(m, v)))
    setMax(m => (m == null ? v : Math.max(m, v)))
    sumRef.current += v; countRef.current += 1
    setSamples(s => (s.length > 600 ? [...s.slice(-599), v] : [...s, v]))
  }, [native, live])
  const nativeLink = sensors.links.hr
  useEffect(() => {
    if (!native) return
    setStatus(nativeLink === 'connected' ? 'connected' : nativeLink === 'idle' ? (sensors.error === 'connect-failed' ? 'error' : 'idle') : 'connecting')
  }, [native, nativeLink, sensors.error])

  const disconnect = useCallback(() => {
    if (native) { disconnectSensor('hr'); setStatus('idle'); return }
    try { deviceRef.current?.gatt?.disconnect() } catch { /* ignore */ }
    deviceRef.current = null
    setStatus('idle')
  }, [native])

  const connect = useCallback(async () => {
    if (!supported) { setStatus('error'); return }
    if (native) { setStatus('connecting'); await connectSensor('hr'); return }
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
  }, [supported, native])

  const avg = countRef.current ? Math.round(sumRef.current / countRef.current) : null
  return { supported, status, bpm, min, max, avg, samples, connect, disconnect }
}
