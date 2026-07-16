// ══════════════════════════════════════════════════════════════════
// CapacitorBleSource — STUB. Implémentation native via
// @capacitor-community/bluetooth-le, prévue pour l'app iOS/Android packagée.
// NON implémentée dans ce lot : le paquet n'est pas installé et sa faisabilité
// sur notre config iOS n'est pas vérifiée. Ne pas remplir sans validation.
// ══════════════════════════════════════════════════════════════════
import type { SensorSource, SensorSample, SensorDevice, SensorKind } from './types'

export class CapacitorBleSource implements SensorSource {
  isAvailable(): Promise<boolean> {
    // Tant que le paquet natif n'est pas intégré, cette source n'est jamais choisie.
    return Promise.resolve(false)
  }
  connect(_kind: SensorKind): Promise<SensorDevice> {
    throw new Error('CapacitorBleSource : non implémenté (hors périmètre de ce lot)')
  }
  disconnect(_d: SensorDevice): Promise<void> {
    throw new Error('CapacitorBleSource : non implémenté (hors périmètre de ce lot)')
  }
  subscribe(_cb: (s: SensorSample) => void): () => void {
    throw new Error('CapacitorBleSource : non implémenté (hors périmètre de ce lot)')
  }
}
