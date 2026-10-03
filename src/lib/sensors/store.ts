'use client'
// ══════════════════════════════════════════════════════════════════════════
// Magasin capteurs (singleton hors React). Une seule source de vérité pour
// les valeurs live (FC, puissance, cadence, vitesse) quel que soit le
// transport : Web Bluetooth (Chrome desktop/Android) ou BLE natif iOS/Android
// (@capacitor-community/bluetooth-le). La connexion survit à la navigation.
// API publique : voir ./bluetooth.ts (façade).
// ══════════════════════════════════════════════════════════════════════════

/** Rôle d'un capteur : ceinture cardio, capteur de puissance / home trainer,
 *  capteur de cadence/vitesse (CSC vélo ou RSC course). */
export type SensorKind = 'hr' | 'power' | 'cadence'
export const SENSOR_KINDS: SensorKind[] = ['hr', 'power', 'cadence']

/** État de liaison d'un rôle. */
export type SensorLink = 'idle' | 'connecting' | 'connected' | 'reconnecting'

/** Codes d'erreur (traduits par l'UI). */
export type SensorError =
  | 'unsupported'   // ni Web Bluetooth ni BLE natif
  | 'bt-off'        // Bluetooth désactivé (Centre de contrôle / Réglages)
  | 'unauthorized'  // autorisation Bluetooth refusée → Réglages de l'app
  | 'scan-failed'
  | 'connect-failed'
  | 'error'

/** Appareil vu pendant un scan (BLE natif). */
export interface FoundSensor {
  id: string
  name: string
  kinds: SensorKind[]
  /** dBm (≈ -40 très proche … -95 limite). null = déjà relié au système. */
  rssi: number | null
}

/** Appareil mémorisé (reconnexion automatique). */
export interface PairedSensor { id: string; name: string; kind: SensorKind }

export interface SensorState {
  /** true si un transport BLE est disponible ici. */
  supported: boolean
  /** true = BLE natif (app iOS/Android), false = Web Bluetooth. */
  native: boolean
  hr: number | null
  power: number | null
  /** Cadence (rpm vélo, ou valeur brute du capteur de foulée). */
  cadence: number | null
  /** Vitesse capteur (km/h) — roue CSC / capteur de foulée RSC. */
  speed: number | null
  /** Nom de l'appareil CONNECTÉ (null sinon) — consommé par les écrans live. */
  hrDevice: string | null
  powerDevice: string | null
  cadenceDevice: string | null
  links: Record<SensorKind, SensorLink>
  connecting: SensorKind | null
  error: SensorError | null
  scanning: boolean
  found: FoundSensor[]
  paired: PairedSensor[]
}

type Listener = () => void

function detectNative(): boolean {
  try {
    if (process.env.NEXT_PUBLIC_NATIVE_APP === '1') return true
    const cap = (globalThis as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor
    return cap?.isNativePlatform?.() ?? false
  } catch { return false }
}
function detectWebBluetooth(): boolean {
  return typeof navigator !== 'undefined' && 'bluetooth' in navigator
}

const PAIRED_KEY = 'thw-ble-paired-v1'

export function loadPaired(): PairedSensor[] {
  try {
    const raw = localStorage.getItem(PAIRED_KEY)
    if (!raw) return []
    const arr: unknown = JSON.parse(raw)
    if (!Array.isArray(arr)) return []
    return arr.filter((p): p is PairedSensor =>
      !!p && typeof p === 'object'
      && typeof (p as PairedSensor).id === 'string'
      && typeof (p as PairedSensor).name === 'string'
      && SENSOR_KINDS.includes((p as PairedSensor).kind))
  } catch { return [] }
}
function savePaired(list: PairedSensor[]): void {
  try { localStorage.setItem(PAIRED_KEY, JSON.stringify(list)) } catch { /* ignore */ }
}

const native = detectNative()
let state: SensorState = {
  supported: native || detectWebBluetooth(),
  native,
  hr: null, power: null, cadence: null, speed: null,
  hrDevice: null, powerDevice: null, cadenceDevice: null,
  links: { hr: 'idle', power: 'idle', cadence: 'idle' },
  connecting: null, error: null, scanning: false, found: [],
  paired: typeof window !== 'undefined' ? loadPaired() : [],
}
const listeners = new Set<Listener>()

export function getSensorState(): SensorState { return state }
export function subscribeSensors(l: Listener): () => void { listeners.add(l); return () => { listeners.delete(l) } }
export function setSensorState(patch: Partial<SensorState>): void {
  state = { ...state, ...patch }
  for (const l of listeners) l()
}
export function setLink(kind: SensorKind, link: SensorLink): void {
  setSensorState({ links: { ...state.links, [kind]: link } })
}

/** Champ « nom de l'appareil connecté » d'un rôle. */
export function deviceField(kind: SensorKind): 'hrDevice' | 'powerDevice' | 'cadenceDevice' {
  return kind === 'hr' ? 'hrDevice' : kind === 'power' ? 'powerDevice' : 'cadenceDevice'
}
/** Remet à zéro les valeurs live d'un rôle (déconnexion). */
export function clearValues(kind: SensorKind): Partial<SensorState> {
  if (kind === 'hr') return { hr: null }
  if (kind === 'power') return { power: null }
  return { cadence: null, speed: null }
}

export function rememberSensor(p: PairedSensor): void {
  // Un seul appareil mémorisé par rôle ; un appareil n'a qu'un rôle.
  const list = loadPaired().filter(x => x.kind !== p.kind && x.id !== p.id)
  list.push(p)
  savePaired(list)
  setSensorState({ paired: list })
}
export function forgetPaired(kind: SensorKind): PairedSensor | null {
  const list = loadPaired()
  const gone = list.find(x => x.kind === kind) ?? null
  const next = list.filter(x => x.kind !== kind)
  savePaired(next)
  setSensorState({ paired: next })
  return gone
}
