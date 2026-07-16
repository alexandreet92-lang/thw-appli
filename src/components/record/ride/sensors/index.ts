// ══════════════════════════════════════════════════════════════════
// Sélection de la source capteur AU RUNTIME, par détection de CAPACITÉ
// (jamais par user-agent). Ordre : Capacitor natif (si présent), sinon Web
// Bluetooth (si le navigateur l'expose), sinon Unavailable.
// ══════════════════════════════════════════════════════════════════
import type { SensorSource } from './types'
import { WebBluetoothSource } from './WebBluetoothSource'
import { CapacitorBleSource } from './CapacitorBleSource'
import { UnavailableSource } from './UnavailableSource'

export type { SensorSource, SensorSample, SensorDevice, SensorKind } from './types'

let cached: SensorSource | null = null

/** Renvoie la meilleure source disponible pour cet environnement (mémoïsée). */
export async function resolveSensorSource(): Promise<SensorSource> {
  if (cached) return cached
  const candidates: SensorSource[] = [new CapacitorBleSource(), new WebBluetoothSource()]
  for (const c of candidates) {
    if (await c.isAvailable()) { cached = c; return c }
  }
  cached = new UnavailableSource()
  return cached
}
