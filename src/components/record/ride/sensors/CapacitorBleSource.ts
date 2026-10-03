// ══════════════════════════════════════════════════════════════════
// CapacitorBleSource — BLE natif (app iOS/Android) via le magasin capteurs
// partagé (src/lib/sensors → src/lib/ble/nativeBle.ts, plugin
// @capacitor-community/bluetooth-le). LECTURE SEULE (notifications), aucune
// écriture de contrôle. Même appareil / mêmes valeurs que la feuille capteurs.
// ══════════════════════════════════════════════════════════════════
import type { SensorSource, SensorSample, SensorDevice, SensorKind } from './types'
import {
  getSensorState, subscribeSensors, connectSensor, disconnectSensor,
  type SensorKind as StoreKind, type SensorState,
} from '@/lib/sensors/bluetooth'

const toStore = (k: SensorKind): StoreKind => (k === 'trainer' ? 'power' : k)
const nameOf = (s: SensorState, k: StoreKind): string | null =>
  k === 'hr' ? s.hrDevice : k === 'power' ? s.powerDevice : s.cadenceDevice

export class CapacitorBleSource implements SensorSource {
  isAvailable(): Promise<boolean> {
    return Promise.resolve(getSensorState().native)
  }

  async connect(kind: SensorKind): Promise<SensorDevice> {
    const k = toStore(kind)
    await connectSensor(k)
    const s = getSensorState()
    const name = nameOf(s, k)
    if (s.links[k] !== 'connected' || !name) throw new Error('BLE : connexion impossible')
    const id = s.paired.find(p => p.kind === k)?.id ?? `${k}-native`
    return { id, kind, name, close: () => disconnectSensor(k) }
  }

  disconnect(d: SensorDevice): Promise<void> {
    d.close()
    return Promise.resolve()
  }

  subscribe(cb: (s: SensorSample) => void): () => void {
    let prev = getSensorState()
    return subscribeSensors(() => {
      const s = getSensorState()
      const out: SensorSample = { ts: Date.now() }
      if (s.power != null && s.power !== prev.power) out.power = s.power
      if (s.cadence != null && s.cadence !== prev.cadence) out.cadence = s.cadence
      if (s.hr != null && s.hr !== prev.hr) out.heartRate = s.hr
      prev = s
      if (out.power != null || out.cadence != null || out.heartRate != null) cb(out)
    })
  }
}
