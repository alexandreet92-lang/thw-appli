'use client'
// ══════════════════════════════════════════════════════════════════════════
// Capteurs Bluetooth (cardio / puissance / cadence-vitesse) — FAÇADE.
//
// Deux transports, une seule API et un seul magasin (./store.ts) :
//  · App native iOS/Android (Capacitor) → BLE natif CoreBluetooth via
//    @capacitor-community/bluetooth-le (src/lib/ble/nativeBle.ts). Web
//    Bluetooth n'existe PAS dans WKWebView : c'était la cause de « impossible
//    d'ajouter un capteur » sur iPhone.
//  · Navigateur (Chrome/Edge desktop, Chrome Android) → Web Bluetooth
//    (sélecteur du navigateur), comportement historique conservé.
//
// Consommateurs : écran record (puces), LiveShell (hr/power/hrDevice/
// powerDevice), feuille capteurs, useHeartRate/usePower, source ride.
// ══════════════════════════════════════════════════════════════════════════
import {
  getSensorState, subscribeSensors, setSensorState, setLink, deviceField, clearValues,
  type SensorKind, type SensorState,
} from './store'
import { parseHeartRate, parseCyclingPower, parseCsc, crankRpm, type RevState } from '@/lib/ble/gatt'

export { getSensorState, subscribeSensors }
export type { SensorKind, SensorState, SensorLink, SensorError, FoundSensor, PairedSensor } from './store'

const native = (): boolean => getSensorState().native

function nativeMod() { return import('@/lib/ble/nativeBle') }

// ── Web Bluetooth (types minimaux, sans `any`) ───────────────────────────
interface WebBtChar extends EventTarget { value?: DataView; startNotifications: () => Promise<WebBtChar> }
interface WebBtService { getCharacteristic: (c: string) => Promise<WebBtChar> }
interface WebBtServer { getPrimaryService: (s: string) => Promise<WebBtService> }
interface WebBtDevice extends EventTarget { name?: string; gatt?: { connected: boolean; connect: () => Promise<WebBtServer>; disconnect: () => void } }
interface WebBt { requestDevice: (o: { filters: { services: string[] }[]; optionalServices?: string[] }) => Promise<WebBtDevice> }

const WEB_GATT: Record<SensorKind, { service: string; characteristic: string }> = {
  hr: { service: 'heart_rate', characteristic: 'heart_rate_measurement' },
  power: { service: 'cycling_power', characteristic: 'cycling_power_measurement' },
  cadence: { service: 'cycling_speed_and_cadence', characteristic: 'csc_measurement' },
}
const webDevices: Partial<Record<SensorKind, WebBtDevice>> = {}
const webCrank: Partial<Record<SensorKind, RevState>> = {}

async function connectWeb(kind: SensorKind): Promise<void> {
  const bt = (typeof navigator !== 'undefined' ? (navigator as Navigator & { bluetooth?: WebBt }).bluetooth : undefined)
  if (!bt) { setSensorState({ supported: false, error: 'unsupported' }); return }
  setSensorState({ connecting: kind, error: null })
  setLink(kind, 'connecting')
  try {
    const g = WEB_GATT[kind]
    const device = await bt.requestDevice({ filters: [{ services: [g.service] }], optionalServices: [g.service] })
    const server = await device.gatt!.connect()
    const service = await server.getPrimaryService(g.service)
    const char = await service.getCharacteristic(g.characteristic)
    await char.startNotifications()
    char.addEventListener('characteristicvaluechanged', (e: Event) => {
      const dv = (e.target as WebBtChar | null)?.value
      if (!dv) return
      if (kind === 'hr') {
        const bpm = parseHeartRate(dv)
        if (bpm != null && bpm >= 20 && bpm <= 240) setSensorState({ hr: bpm })
      } else {
        const cp = kind === 'power' ? parseCyclingPower(dv) : null
        const crank = kind === 'power' ? cp?.crank : parseCsc(dv).crank
        const patch: Partial<SensorState> = {}
        if (cp && cp.power >= 0 && cp.power <= 3000) patch.power = cp.power
        if (crank) {
          const prev = webCrank[kind]
          webCrank[kind] = crank
          const rpm = prev ? crankRpm(prev, crank) : null
          if (rpm != null && (kind === 'cadence' || !webDevices.cadence)) patch.cadence = rpm
        }
        if (Object.keys(patch).length) setSensorState(patch)
      }
    })
    device.addEventListener('gattserverdisconnected', () => { disconnectSensor(kind) })
    webDevices[kind] = device
    setSensorState({ connecting: null, [deviceField(kind)]: device.name || 'Capteur', error: null, links: { ...getSensorState().links, [kind]: 'connected' } })
  } catch (e) {
    // Annulation utilisateur = pas une vraie erreur.
    const msg = e instanceof Error ? e.message : ''
    setSensorState({ connecting: null, error: /cancel|User cancelled|chooser/i.test(msg) ? null : 'connect-failed', links: { ...getSensorState().links, [kind]: 'idle' } })
  }
}

// ── API publique ─────────────────────────────────────────────────────────

/** Connecte un capteur du rôle demandé. Web : sélecteur du navigateur.
 *  Natif : appareil mémorisé s'il existe, sinon sélecteur natif iOS. */
export async function connectSensor(kind: SensorKind): Promise<void> {
  if (native()) { await (await nativeMod()).pickAndConnectNative(kind); return }
  await connectWeb(kind)
}

/** Déconnecte (l'appareil reste mémorisé en natif). */
export function disconnectSensor(kind: SensorKind): void {
  if (native()) { void nativeMod().then(m => m.disconnectNative(kind, { keepPaired: true })); return }
  const d = webDevices[kind]
  try { if (d?.gatt?.connected) d.gatt.disconnect() } catch { /* ignore */ }
  delete webDevices[kind]
  delete webCrank[kind]
  setSensorState({ ...clearValues(kind), [deviceField(kind)]: null, links: { ...getSensorState().links, [kind]: 'idle' } })
}

/** Déconnecte ET oublie l'appareil (plus de reconnexion automatique). */
export function forgetSensor(kind: SensorKind): void {
  if (native()) { void nativeMod().then(m => m.disconnectNative(kind)); return }
  disconnectSensor(kind)
}

/** Natif : connecte un appareil trouvé par le scan à un rôle. */
export async function connectFoundSensor(id: string, name: string, kind: SensorKind): Promise<void> {
  if (!native()) return
  await (await nativeMod()).connectNative(id, name, kind)
}

/** Natif : scan des capteurs standard (no-op sur le web). */
export async function startSensorScan(): Promise<void> {
  if (!native()) return
  await (await nativeMod()).startScanNative()
}
export async function stopSensorScan(): Promise<void> {
  if (!native()) return
  await (await nativeMod()).stopScanNative()
}

/** Reconnexion automatique des appareils mémorisés (ouverture de l'écran
 *  record). Ne déclenche AUCUN prompt Bluetooth s'il n'y a rien de mémorisé. */
export function autoReconnectSensors(): void {
  if (!native() || !getSensorState().paired.length) return
  void nativeMod().then(m => m.autoReconnectNative()).catch(() => { /* plugin absent */ })
}

/** Réglages de l'app (autorisation Bluetooth). */
export async function openSensorSettings(): Promise<void> {
  if (!native()) return
  await (await nativeMod()).openBleAppSettings()
}
