'use client'
// ══════════════════════════════════════════════════════════════════════════
// BLE NATIF (app iOS/Android Capacitor) — @capacitor-community/bluetooth-le.
//
// Pourquoi : Web Bluetooth N'EXISTE PAS dans WKWebView (iOS) → impossible d'y
// appairer une ceinture cardio ou un capteur de puissance. Ce module passe par
// CoreBluetooth via le plugin et alimente le MÊME magasin que Web Bluetooth
// (src/lib/sensors/store.ts) : les écrans live lisent hr / power / cadence /
// speed sans savoir d'où ils viennent.
//
// Fonctionnalités : scan des services standard (FC 0x180D, puissance 0x1818,
// CSC 0x1816, RSC 0x1814, FTMS 0x1826) avec RSSI, connexion + notifications,
// décodage GATT (./gatt.ts), mémorisation des appareils (localStorage) et
// reconnexion automatique (ouverture de l'écran record + coupure inopinée).
//
// Le plugin n'est initialisé (→ prompt d'autorisation Bluetooth iOS) QUE
// lorsque l'utilisateur ouvre la feuille capteurs ou qu'un appareil est déjà
// mémorisé — jamais au démarrage de l'app.
// ══════════════════════════════════════════════════════════════════════════
import type { BleClientInterface, ScanResult } from '@capacitor-community/bluetooth-le'
import { currentLang } from '@/lib/i18n/locale'
import {
  GATT, normUuid, parseHeartRate, parseCyclingPower, parseCsc, parseRsc, parseIndoorBike,
  crankRpm, wheelKmh, type RevState,
} from './gatt'
import {
  getSensorState, setSensorState, setLink, deviceField, clearValues,
  rememberSensor, forgetPaired, loadPaired,
  type SensorKind, type FoundSensor, type PairedSensor,
} from '@/lib/sensors/store'

/** Circonférence de roue par défaut (700×25C) pour la vitesse CSC. */
const WHEEL_CIRCUMFERENCE_M = 2.105
/** Sans nouvel événement manivelle/roue pendant ce délai → cadence/vitesse 0. */
const STALE_MS = 3500
const SCAN_DURATION_MS = 30000
const CONNECT_TIMEOUT_MS = 12000
const RETRY_DELAYS_MS = [2000, 4000, 8000, 15000, 30000, 30000]

const SERVICES_BY_KIND: Record<SensorKind, string[]> = {
  hr: [GATT.HR_SERVICE],
  power: [GATT.CP_SERVICE, GATT.FTMS_SERVICE],
  cadence: [GATT.CSC_SERVICE, GATT.RSC_SERVICE],
}
const ALL_SERVICES = [GATT.HR_SERVICE, GATT.CP_SERVICE, GATT.FTMS_SERVICE, GATT.CSC_SERVICE, GATT.RSC_SERVICE]

function kindsFromServices(uuids: string[] | undefined): SensorKind[] {
  const set = new Set((uuids ?? []).map(normUuid))
  const out: SensorKind[] = []
  if (set.has(GATT.HR_SERVICE)) out.push('hr')
  if (set.has(GATT.CP_SERVICE) || set.has(GATT.FTMS_SERVICE)) out.push('power')
  if (set.has(GATT.CSC_SERVICE) || set.has(GATT.RSC_SERVICE)) out.push('cadence')
  return out
}

// ── Chargement paresseux du plugin ───────────────────────────────────────
let clientPromise: Promise<BleClientInterface> | null = null
function client(): Promise<BleClientInterface> {
  if (!clientPromise) clientPromise = import('@capacitor-community/bluetooth-le').then(m => m.BleClient)
  return clientPromise
}

const PICKER_STRINGS = {
  fr: { scanning: 'Recherche…', cancel: 'Annuler', availableDevices: 'Capteurs disponibles', noDeviceFound: 'Aucun capteur trouvé' },
  en: { scanning: 'Scanning…', cancel: 'Cancel', availableDevices: 'Available sensors', noDeviceFound: 'No sensor found' },
  es: { scanning: 'Buscando…', cancel: 'Cancelar', availableDevices: 'Sensores disponibles', noDeviceFound: 'Ningún sensor encontrado' },
} as const

let initPromise: Promise<boolean> | null = null
let btEnabled = true

/** Initialise CoreBluetooth (1 seule fois). false si refusé / indisponible. */
export function ensureBle(): Promise<boolean> {
  if (initPromise) return initPromise
  initPromise = (async () => {
    const ble = await client()
    try {
      await ble.initialize()
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      setSensorState({ error: /denied|unauthori[sz]ed|permission/i.test(msg) ? 'unauthorized' : /unsupported|not implemented|unimplemented/i.test(msg) ? 'unsupported' : 'error' })
      return false
    }
    try { await ble.setDisplayStrings(PICKER_STRINGS[currentLang()] ?? PICKER_STRINGS.fr) } catch { /* ignore */ }
    try { btEnabled = await ble.isEnabled() } catch { btEnabled = true }
    if (!btEnabled) setSensorState({ error: 'bt-off' })
    try {
      await ble.startEnabledNotifications(enabled => {
        btEnabled = enabled
        if (!enabled) {
          setSensorState({ error: 'bt-off', scanning: false })
        } else {
          if (getSensorState().error === 'bt-off') setSensorState({ error: null })
          void autoReconnectNative()
        }
      })
    } catch { /* ignore */ }
    return true
  })()
  void initPromise.then(ok => { if (!ok) initPromise = null })
  return initPromise
}

// ── Liaisons actives ─────────────────────────────────────────────────────
interface Link {
  id: string
  name: string
  kind: SensorKind
  /** true quand la coupure est voulue (Déconnecter / Oublier) → pas de retry. */
  manual: boolean
  crank?: RevState
  wheel?: RevState
  lastCrankMove: number
  lastWheelMove: number
  staleTimer: ReturnType<typeof setInterval> | null
}
const links = new Map<SensorKind, Link>()
const retryTimers = new Map<SensorKind, ReturnType<typeof setTimeout>>()
const retryCount = new Map<SensorKind, number>()

function cancelRetry(kind: SensorKind): void {
  const t = retryTimers.get(kind)
  if (t) clearTimeout(t)
  retryTimers.delete(kind)
}

function stopStale(link: Link): void {
  if (link.staleTimer) clearInterval(link.staleTimer)
  link.staleTimer = null
}

/** Cadence de la puissance (manivelle) utilisée seulement sans capteur dédié. */
function cadenceOwnedBy(kind: SensorKind): boolean {
  if (kind === 'cadence') return true
  return !links.has('cadence') || getSensorState().links.cadence !== 'connected'
}

function onCrank(link: Link, crank: RevState | undefined, now: number): number | null | undefined {
  if (!crank) return undefined
  const prev = link.crank
  link.crank = crank
  if (!prev) return undefined
  const rpm = crankRpm(prev, crank)
  if (rpm != null) { link.lastCrankMove = now; return rpm }
  return now - link.lastCrankMove > STALE_MS ? 0 : undefined
}
function onWheel(link: Link, wheel: RevState | undefined, now: number, ticks: number): number | null | undefined {
  if (!wheel) return undefined
  const prev = link.wheel
  link.wheel = wheel
  if (!prev) return undefined
  const kmh = wheelKmh(prev, wheel, WHEEL_CIRCUMFERENCE_M, ticks)
  if (kmh != null) { link.lastWheelMove = now; return kmh }
  return now - link.lastWheelMove > STALE_MS ? 0 : undefined
}

async function subscribeRole(ble: BleClientInterface, link: Link): Promise<void> {
  const { id, kind } = link
  let services: string[] = []
  try { services = (await ble.getServices(id)).map(s => normUuid(s.uuid)) } catch { /* découverte partielle */ }
  /** Service présent (ou inconnu : découverte vide → on tente quand même). */
  const has = (u: string) => services.length === 0 || services.includes(u)

  if (kind === 'hr') {
    await ble.startNotifications(id, GATT.HR_SERVICE, GATT.HR_MEASUREMENT, dv => {
      const bpm = parseHeartRate(dv)
      if (bpm != null && bpm >= 20 && bpm <= 240) setSensorState({ hr: bpm })
    })
    return
  }

  if (kind === 'power') {
    if (has(GATT.CP_SERVICE)) {
      try {
        await ble.startNotifications(id, GATT.CP_SERVICE, GATT.CP_MEASUREMENT, dv => {
          const r = parseCyclingPower(dv)
          if (!r) return
          const now = Date.now()
          const patch: Parameters<typeof setSensorState>[0] = {}
          if (r.power >= 0 && r.power <= 3000) patch.power = r.power
          if (cadenceOwnedBy('power')) {
            const cad = onCrank(link, r.crank, now)
            if (cad !== undefined) patch.cadence = cad
            const spd = onWheel(link, r.wheel, now, 2048)
            if (spd !== undefined) patch.speed = spd
          }
          setSensorState(patch)
        })
        return
      } catch (e) {
        if (services.length && !services.includes(GATT.FTMS_SERVICE)) throw e
      }
    }
    // Repli home trainer FTMS (Indoor Bike Data).
    await ble.startNotifications(id, GATT.FTMS_SERVICE, GATT.FTMS_INDOOR_BIKE, dv => {
      const r = parseIndoorBike(dv)
      const patch: Parameters<typeof setSensorState>[0] = {}
      if (r.power != null && r.power >= 0 && r.power <= 3000) patch.power = r.power
      if (cadenceOwnedBy('power')) {
        if (r.cadence != null && r.cadence >= 0 && r.cadence <= 250) patch.cadence = r.cadence
        if (r.speedKmh != null && r.speedKmh >= 0 && r.speedKmh <= 120) patch.speed = r.speedKmh
      }
      if (Object.keys(patch).length) setSensorState(patch)
    })
    return
  }

  // Cadence / vitesse : CSC (vélo) en priorité, sinon RSC (capteur de foulée).
  if (has(GATT.CSC_SERVICE)) {
    try {
      await ble.startNotifications(id, GATT.CSC_SERVICE, GATT.CSC_MEASUREMENT, dv => {
        const r = parseCsc(dv)
        const now = Date.now()
        const patch: Parameters<typeof setSensorState>[0] = {}
        const cad = onCrank(link, r.crank, now)
        if (cad !== undefined) patch.cadence = cad
        const spd = onWheel(link, r.wheel, now, 1024)
        if (spd !== undefined) patch.speed = spd
        if (Object.keys(patch).length) setSensorState(patch)
      })
      // Capteur immobile = plus aucune notification → on force 0 après STALE_MS.
      link.staleTimer = setInterval(() => {
        const now = Date.now()
        const s = getSensorState()
        const patch: Parameters<typeof setSensorState>[0] = {}
        if (link.crank && s.cadence && now - link.lastCrankMove > STALE_MS) patch.cadence = 0
        if (link.wheel && s.speed && now - link.lastWheelMove > STALE_MS) patch.speed = 0
        if (Object.keys(patch).length) setSensorState(patch)
      }, 1000)
      return
    } catch (e) {
      if (services.length && !services.includes(GATT.RSC_SERVICE)) throw e
    }
  }
  await ble.startNotifications(id, GATT.RSC_SERVICE, GATT.RSC_MEASUREMENT, dv => {
    const r = parseRsc(dv)
    if (r) setSensorState({ speed: r.speedKmh, cadence: r.cadence })
  })
}

function handleDisconnect(kind: SensorKind, deviceId: string): void {
  const link = links.get(kind)
  if (!link || link.id !== deviceId) return
  stopStale(link)
  links.delete(kind)
  setSensorState({ ...clearValues(kind), [deviceField(kind)]: null })
  if (link.manual) { setLink(kind, 'idle'); return }
  // Coupure inopinée (hors de portée, pile…) → reconnexion avec backoff.
  setLink(kind, 'reconnecting')
  scheduleRetry(kind)
}

function scheduleRetry(kind: SensorKind): void {
  cancelRetry(kind)
  const n = retryCount.get(kind) ?? 0
  const paired = loadPaired().find(p => p.kind === kind)
  if (!paired || n >= RETRY_DELAYS_MS.length) {
    retryCount.delete(kind)
    if (getSensorState().links[kind] === 'reconnecting') setLink(kind, 'idle')
    return
  }
  retryCount.set(kind, n + 1)
  retryTimers.set(kind, setTimeout(() => {
    retryTimers.delete(kind)
    void connectNative(paired.id, paired.name, kind, { silent: true }).then(ok => {
      if (ok) retryCount.delete(kind)
      else scheduleRetry(kind)
    })
  }, RETRY_DELAYS_MS[n]))
}

/** Connecte un appareil à un rôle et s'abonne à ses mesures. */
export async function connectNative(id: string, name: string, kind: SensorKind, opts: { silent?: boolean } = {}): Promise<boolean> {
  if (!(await ensureBle())) return false
  if (!btEnabled) { setSensorState({ error: 'bt-off' }); return false }
  const ble = await client()

  // Un seul appareil par rôle : on remplace l'éventuel précédent.
  const prev = links.get(kind)
  if (prev && prev.id !== id) await disconnectNative(kind, { keepPaired: true })
  if (prev && prev.id === id && getSensorState().links[kind] === 'connected') return true

  setLink(kind, opts.silent ? 'reconnecting' : 'connecting')
  if (!opts.silent) setSensorState({ connecting: kind, error: null })

  const link: Link = { id, name, kind, manual: false, lastCrankMove: Date.now(), lastWheelMove: Date.now(), staleTimer: null }
  try {
    // Après un redémarrage, le plugin ne connaît pas encore l'appareil :
    // getDevices() le récupère par son identifiant (CBPeripheral) mémorisé.
    try { await ble.getDevices([id]) } catch { /* Android / déjà connu */ }
    await ble.connect(id, did => handleDisconnect(kind, did), { timeout: CONNECT_TIMEOUT_MS })
    links.set(kind, link)
    await subscribeRole(ble, link)
    rememberSensor({ id, name, kind })
    cancelRetry(kind)
    setSensorState({ [deviceField(kind)]: name, connecting: null, error: null, links: { ...getSensorState().links, [kind]: 'connected' } })
    return true
  } catch {
    links.delete(kind)
    stopStale(link)
    try { await ble.disconnect(id) } catch { /* ignore */ }
    const s = getSensorState()
    setSensorState({
      connecting: s.connecting === kind ? null : s.connecting,
      error: opts.silent ? s.error : 'connect-failed',
      links: { ...s.links, [kind]: opts.silent ? 'reconnecting' : 'idle' },
    })
    return false
  }
}

/** Déconnexion volontaire (pas de reconnexion auto). */
export async function disconnectNative(kind: SensorKind, opts: { keepPaired?: boolean } = {}): Promise<void> {
  cancelRetry(kind)
  retryCount.delete(kind)
  const link = links.get(kind)
  if (link) {
    link.manual = true
    stopStale(link)
    links.delete(kind)
    try {
      const ble = await client()
      await ble.disconnect(link.id)
    } catch { /* déjà coupé */ }
  }
  if (!opts.keepPaired) forgetPaired(kind)
  setSensorState({ ...clearValues(kind), [deviceField(kind)]: null, links: { ...getSensorState().links, [kind]: 'idle' } })
}

/** Sélecteur natif (feuille iOS du plugin) — utilisé par les écrans qui
 *  appellent connectSensor(kind) sans passer par la feuille capteurs. */
export async function pickAndConnectNative(kind: SensorKind): Promise<boolean> {
  const paired = loadPaired().find(p => p.kind === kind)
  if (paired && await connectNative(paired.id, paired.name, kind)) return true
  if (!(await ensureBle())) return false
  const ble = await client()
  try {
    const dev = await ble.requestDevice({ services: SERVICES_BY_KIND[kind], optionalServices: ALL_SERVICES })
    return await connectNative(dev.deviceId, dev.name || 'Capteur', kind)
  } catch {
    // Annulation utilisateur = pas une erreur.
    setSensorState({ connecting: null })
    return false
  }
}

// ── Scan ─────────────────────────────────────────────────────────────────
let scanTimer: ReturnType<typeof setTimeout> | null = null
let flushTimer: ReturnType<typeof setTimeout> | null = null
const pending = new Map<string, FoundSensor>()

function flushFound(): void {
  flushTimer = null
  const byId = new Map(getSensorState().found.map(f => [f.id, f]))
  for (const [id, f] of pending) {
    const old = byId.get(id)
    byId.set(id, old ? { ...old, ...f, kinds: f.kinds.length ? f.kinds : old.kinds, rssi: f.rssi ?? old.rssi } : f)
  }
  pending.clear()
  const found = [...byId.values()].sort((a, b) => (b.rssi ?? -30) - (a.rssi ?? -30))
  setSensorState({ found })
}
function queueFound(f: FoundSensor): void {
  pending.set(f.id, f)
  if (!flushTimer) flushTimer = setTimeout(flushFound, 400)
}

/** Lance un scan (30 s) des capteurs standard. */
export async function startScanNative(): Promise<void> {
  if (!(await ensureBle())) return
  if (!btEnabled) { setSensorState({ error: 'bt-off', scanning: false }); return }
  const ble = await client()
  try { await ble.stopLEScan() } catch { /* aucun scan en cours */ }
  setSensorState({ scanning: true, error: null })

  // Appareils déjà reliés au système (ex. ceinture appairée à une autre app) :
  // ils n'émettent plus d'annonces, on les liste quand même.
  for (const kind of ['hr', 'power', 'cadence'] as SensorKind[]) {
    try {
      const devs = await ble.getConnectedDevices(SERVICES_BY_KIND[kind])
      for (const d of devs) queueFound({ id: d.deviceId, name: d.name || 'Capteur', kinds: [kind], rssi: null })
    } catch { /* ignore */ }
  }

  try {
    await ble.requestLEScan({ services: ALL_SERVICES, allowDuplicates: true }, (r: ScanResult) => {
      const kinds = kindsFromServices(r.uuids ?? r.device.uuids)
      if (!kinds.length) return
      queueFound({ id: r.device.deviceId, name: r.localName || r.device.name || 'Capteur', kinds, rssi: r.rssi ?? null })
    })
  } catch {
    setSensorState({ scanning: false, error: 'scan-failed' })
    return
  }
  if (scanTimer) clearTimeout(scanTimer)
  scanTimer = setTimeout(() => { void stopScanNative() }, SCAN_DURATION_MS)
}

export async function stopScanNative(): Promise<void> {
  if (scanTimer) { clearTimeout(scanTimer); scanTimer = null }
  if (flushTimer) { clearTimeout(flushTimer); flushFound() }
  if (getSensorState().scanning) setSensorState({ scanning: false })
  if (!initPromise) return
  try { const ble = await client(); await ble.stopLEScan() } catch { /* ignore */ }
}

/** Reconnecte les appareils mémorisés (ouverture de l'écran record). */
export async function autoReconnectNative(): Promise<void> {
  const paired: PairedSensor[] = loadPaired()
  if (!paired.length) return
  if (!(await ensureBle()) || !btEnabled) return
  for (const p of paired) {
    const st = getSensorState().links[p.kind]
    if (st === 'connected' || st === 'connecting' || retryTimers.has(p.kind)) continue
    retryCount.delete(p.kind)
    void connectNative(p.id, p.name, p.kind, { silent: true }).then(ok => { if (!ok) scheduleRetry(p.kind) })
  }
}

/** Réglages de l'app (autorisation Bluetooth refusée). */
export async function openBleAppSettings(): Promise<void> {
  try { const ble = await client(); await ble.openAppSettings() } catch { /* ignore */ }
}
