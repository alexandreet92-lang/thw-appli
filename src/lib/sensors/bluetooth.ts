'use client'
// ══════════════════════════════════════════════════════════════════════════
// Capteurs Bluetooth (cardio / puissance) via Web Bluetooth.
//
// ⚠️ Web Bluetooth n'est PAS supporté par Safari iOS (Apple le bloque). Cette
// couche fonctionne sur Android Chrome et Chrome/Edge desktop. Sur iOS il faudra
// un plugin natif (@capacitor-community/bluetooth-le) + un build Xcode — le
// magasin ci-dessous restera l'API commune (mêmes valeurs hr/power exposées).
//
// Store singleton (hors React) : la connexion survit à la navigation et le
// lecteur d'activité peut lire les dernières valeurs. S'abonner via subscribe().
// ══════════════════════════════════════════════════════════════════════════

export type SensorKind = 'hr' | 'power'
export interface SensorState {
  supported: boolean
  hr: number | null
  power: number | null
  hrDevice: string | null
  powerDevice: string | null
  connecting: SensorKind | null
  error: string | null
}

type Listener = () => void

const GATT = {
  hr: { service: 'heart_rate', characteristic: 'heart_rate_measurement' },
  power: { service: 'cycling_power', characteristic: 'cycling_power_measurement' },
} as const

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type BT = any

let state: SensorState = {
  supported: typeof navigator !== 'undefined' && !!(navigator as BT).bluetooth,
  hr: null, power: null, hrDevice: null, powerDevice: null, connecting: null, error: null,
}
const listeners = new Set<Listener>()
const devices: Partial<Record<SensorKind, BT>> = {}

function emit() { for (const l of listeners) l() }
function set(patch: Partial<SensorState>) { state = { ...state, ...patch }; emit() }

export function getSensorState(): SensorState { return state }
export function subscribeSensors(l: Listener): () => void { listeners.add(l); return () => { listeners.delete(l) } }

// Décodage cardio (0x2A37) : flag bit0 = format (uint8 ou uint16).
function parseHr(dv: DataView): number {
  const flags = dv.getUint8(0)
  return (flags & 0x01) ? dv.getUint16(1, true) : dv.getUint8(1)
}
// Décodage puissance (0x2A63) : 2 octets de flags puis puissance instantanée (int16).
function parsePower(dv: DataView): number { return dv.getInt16(2, true) }

export async function connectSensor(kind: SensorKind): Promise<void> {
  const bt = (navigator as BT)?.bluetooth
  if (!bt) { set({ supported: false, error: 'unsupported' }); return }
  set({ connecting: kind, error: null })
  try {
    const g = GATT[kind]
    const device: BT = await bt.requestDevice({ filters: [{ services: [g.service] }], optionalServices: [g.service] })
    const server = await device.gatt.connect()
    const service = await server.getPrimaryService(g.service)
    const char = await service.getCharacteristic(g.characteristic)
    await char.startNotifications()
    char.addEventListener('characteristicvaluechanged', (e: BT) => {
      const dv: DataView = e.target.value
      if (kind === 'hr') set({ hr: parseHr(dv) })
      else set({ power: parsePower(dv) })
    })
    device.addEventListener('gattserverdisconnected', () => { disconnectSensor(kind) })
    devices[kind] = device
    set({ connecting: null, [kind === 'hr' ? 'hrDevice' : 'powerDevice']: (device.name as string) || 'Capteur', error: null })
  } catch (e) {
    // Annulation utilisateur = pas une vraie erreur.
    const msg = e instanceof Error ? e.message : ''
    set({ connecting: null, error: /cancel|User cancelled|chooser/i.test(msg) ? null : (msg || 'error') })
  }
}

export function disconnectSensor(kind: SensorKind): void {
  const d = devices[kind]
  try { if (d?.gatt?.connected) d.gatt.disconnect() } catch { /* ignore */ }
  delete devices[kind]
  if (kind === 'hr') set({ hr: null, hrDevice: null })
  else set({ power: null, powerDevice: null })
}
