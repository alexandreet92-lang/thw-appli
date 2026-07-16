// ══════════════════════════════════════════════════════════════════
// UnavailableSource — aucune source capteur disponible (ex. Safari iOS, qui
// n'a ni Web Bluetooth ni le pont Capacitor). isAvailable() → false ; l'UI
// affiche un état « capteurs indisponibles sur ce navigateur » et l'écran
// reste consultable (aucune donnée temps réel).
// ══════════════════════════════════════════════════════════════════
import type { SensorSource, SensorSample, SensorDevice, SensorKind } from './types'

export class UnavailableSource implements SensorSource {
  isAvailable(): Promise<boolean> { return Promise.resolve(false) }
  connect(_kind: SensorKind): Promise<SensorDevice> {
    throw new Error('Capteurs indisponibles sur ce navigateur')
  }
  disconnect(_d: SensorDevice): Promise<void> { return Promise.resolve() }
  subscribe(_cb: (s: SensorSample) => void): () => void { return () => {} }
}
