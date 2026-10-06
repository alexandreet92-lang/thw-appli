'use client'
// ══════════════════════════════════════════════════════════════════════════
// Géolocalisation multi-plateforme.
// · App native (Capacitor iOS/Android) → plugin @capacitor/geolocation (natif,
//   CoreLocation). `navigator.geolocation` n'est PAS fiable dans WKWebView.
// · Web (Safari / navigateur) → navigator.geolocation classique.
// Interface unifiée : watchPosition(onPos, onErr, opts) → { clear() }.
//
// ── Pourquoi un « hub » natif unique (cause du « Recherche GPS… » infini) ──
// Le plugin iOS (8.x) partage UN SEUL CLLocationManager entre tous les appels
// et a deux pièges :
//  1. Si AUCUNE position n'arrive avant `timeout`, il émet une erreur TIMEOUT,
//     ARRÊTE la localisation et SUPPRIME TOUS les watchers (y compris ceux
//     des autres écrans). Rien ne redémarrait → statut figé à jamais.
//  2. getCurrentPosition() pendant un watch remplace le minuteur du watch :
//     un timeout court (5 s, écran de pré-autorisation) tuait le suivi actif.
// Ici : un seul watch natif partagé (multiplexé en JS), un timeout large, un
// redémarrage automatique sur timeout / retour au premier plan, et
// getCurrentPosition() natif servi par le hub (jamais par le plugin).
// ══════════════════════════════════════════════════════════════════════════
import { isNativeApp } from './platform'
// Types seuls (aucun JS importé statiquement) : le plugin background est chargé
// à l'exécution via registerPlugin(), uniquement en natif pendant une séance.
import type { BackgroundGeolocationPlugin, Location as BgLocation } from '@capacitor-community/background-geolocation'

export interface GeoOpts { enableHighAccuracy?: boolean; timeout?: number; maximumAge?: number }
export interface GeoHandle { clear: () => void }

/** Nature de l'erreur, indépendante de la plateforme. */
export type GeoErrKind =
  | 'denied'        // autorisation refusée / restreinte
  | 'disabled'      // Service de localisation désactivé (Réglages › Confidentialité)
  | 'timeout'       // pas de position dans le délai (on continue de chercher)
  | 'unavailable'   // position momentanément indisponible (on continue)
  | 'unknown'

export interface GeoErr { code?: number | string; message?: string; kind: GeoErrKind }
type GeoPos = GeolocationPosition

/** Classe une erreur (W3C numérique ou plugin « OS-PLUG-GLOC-000x »). */
export function classifyGeoError(e: unknown): GeoErr {
  const o = (e && typeof e === 'object' ? e : {}) as { code?: unknown; message?: unknown }
  const code = typeof o.code === 'number' || typeof o.code === 'string' ? o.code : undefined
  const message = typeof o.message === 'string' ? o.message : String(e ?? '')
  const m = message.toLowerCase()
  const c = String(code ?? '')
  let kind: GeoErrKind = 'unknown'
  if (code === 1 || /GLOC-000[38]/.test(c) || m.includes('denied') || m.includes('restricted') || m.includes('permission')) kind = 'denied'
  else if (/GLOC-0007/.test(c) || m.includes('services are not enabled') || m.includes('location services')) kind = 'disabled'
  else if (code === 3 || /GLOC-0010/.test(c) || m.includes('timeout') || m.includes('in time')) kind = 'timeout'
  else if (code === 2 || /GLOC-0002/.test(c) || m.includes('unavailable') || m.includes('obtain the location')) kind = 'unavailable'
  return { code, message, kind }
}

/** Autorisation de localisation (native). */
export type GeoPermission = 'granted' | 'denied' | 'prompt' | 'disabled' | 'unknown'

// ══════════════════════════════ NATIF ══════════════════════════════════
type GeoPlugin = typeof import('@capacitor/geolocation')['Geolocation']
let pluginPromise: Promise<GeoPlugin> | null = null
function plugin(): Promise<GeoPlugin> {
  if (!pluginPromise) pluginPromise = import('@capacitor/geolocation').then(m => m.Geolocation)
  return pluginPromise
}

// ── Plugin « background » (séance en cours) ──────────────────────────────
// @capacitor-community/background-geolocation ne livre PAS de JS : il s'enregistre
// via registerPlugin() de @capacitor/core. On le charge paresseusement, en natif
// seulement ; échec d'import / plugin absent → null (repli sur le foreground).
let bgPluginPromise: Promise<BackgroundGeolocationPlugin | null> | null = null
function bgPlugin(): Promise<BackgroundGeolocationPlugin | null> {
  if (!bgPluginPromise) {
    bgPluginPromise = import('@capacitor/core')
      .then(m => m.registerPlugin<BackgroundGeolocationPlugin>('BackgroundGeolocation'))
      .catch(() => null)
  }
  return bgPluginPromise
}

/** Vérifie puis, si besoin, demande l'autorisation (prompt iOS « Lorsque
 *  l'app est active »). Ne bloque jamais indéfiniment côté appelant. */
export async function ensureNativeGeoPermission(): Promise<GeoPermission> {
  const Geo = await plugin()
  let st: string
  try {
    st = (await Geo.checkPermissions()).location
  } catch (e) {
    return classifyGeoError(e).kind === 'disabled' ? 'disabled' : 'unknown'
  }
  if (st === 'granted') return 'granted'
  if (st === 'denied') return 'denied'
  // 'prompt' / 'prompt-with-rationale' → demande système. Si la clé Info.plist
  // NSLocationWhenInUseUsageDescription manque, iOS n'affiche RIEN et la
  // promesse ne se résout jamais : on le signale en console au bout de 20 s.
  const warn = setTimeout(() => {
    console.warn('[geo] requestPermissions sans réponse — vérifier NSLocationWhenInUseUsageDescription dans ios/App/App/Info.plist')
  }, 20000)
  try {
    const r = await Geo.requestPermissions({ permissions: ['location'] })
    return r.location === 'granted' ? 'granted' : r.location === 'denied' ? 'denied' : 'prompt'
  } catch (e) {
    const k = classifyGeoError(e).kind
    return k === 'disabled' ? 'disabled' : k === 'denied' ? 'denied' : 'unknown'
  } finally { clearTimeout(warn) }
}

interface Sub { onPos: (p: GeoPos) => void; onErr: (e: GeoErr) => void }
const subs = new Set<Sub>()
let nativeWatchId: string | null = null
let starting = false
let lastFix: GeoPos | null = null
let lastFixAt = 0
let restartTimer: ReturnType<typeof setTimeout> | null = null
let silenceTimer: ReturnType<typeof setTimeout> | null = null
let resumeListener: { remove: () => Promise<void> } | null = null

// Mode « arrière-plan » : activé pendant un enregistrement (setBackgroundTracking).
// Quand il est vrai, la source des positions bascule du plugin foreground
// (@capacitor/geolocation) vers le watcher background (CLLocationManager avec
// « Allows Background Location Updates ») — une seule source active à la fois,
// alimentant les MÊMES abonnés (subs). Hors séance : foreground, pour ne pas
// demander l'autorisation « Toujours » ni afficher la bannière inutilement.
let backgroundMode = false
let bgWatcherId: string | null = null
let bgStarting = false

/** Bannière iOS (arrière-plan) — textes FR. */
const BG_TITLE = 'Hybrid enregistre ta séance'
const BG_MESSAGE = "Trajet en cours d'enregistrement"

/** Délai du plugin avant TIMEOUT (qui tue le watch) : large, on redémarre ensuite. */
const NATIVE_WATCH_TIMEOUT_MS = 60000

function broadcastErr(e: GeoErr): void { for (const s of subs) s.onErr(e) }

function toW3C(p: { timestamp: number; coords: { latitude: number; longitude: number; accuracy: number; altitude: number | null; altitudeAccuracy?: number | null; heading: number | null; speed: number | null } }): GeoPos {
  const coords = {
    latitude: p.coords.latitude,
    longitude: p.coords.longitude,
    accuracy: p.coords.accuracy,
    altitude: p.coords.altitude ?? null,
    altitudeAccuracy: p.coords.altitudeAccuracy ?? null,
    heading: p.coords.heading ?? null,
    speed: p.coords.speed != null && p.coords.speed >= 0 ? p.coords.speed : null,
  }
  return { timestamp: p.timestamp, coords: { ...coords, toJSON: () => coords }, toJSON: () => ({ timestamp: p.timestamp, coords }) } as GeoPos
}

async function stopNativeWatch(): Promise<void> {
  clearSilenceWatchdog()
  const id = nativeWatchId
  nativeWatchId = null
  if (id == null) return
  try { await (await plugin()).clearWatch({ id }) } catch { /* ignore */ }
}

function scheduleRestart(ms: number): void {
  if (restartTimer) clearTimeout(restartTimer)
  restartTimer = setTimeout(() => {
    restartTimer = null
    if (!subs.size) return
    void (async () => { await stopNativeWatch(); await startNativeWatch() })()
  }, ms)
}

/** Chien de garde « watch silencieux » : sur iOS, watchPosition peut ne plus
 *  émettre (à l'arrêt, ou watch coincé après un changement d'état). Si aucune
 *  position fraîche n'est arrivée depuis 10 s alors qu'on est abonné en
 *  foreground, on relance le watch — ce qui réémet aussitôt un fix via le seed
 *  getCurrentPosition de startNativeWatch. En mouvement, lastFixAt avance et on
 *  se contente de ré-armer (aucun redémarrage). */
function clearSilenceWatchdog(): void {
  if (silenceTimer) { clearTimeout(silenceTimer); silenceTimer = null }
}
function armSilenceWatchdog(): void {
  clearSilenceWatchdog()
  silenceTimer = setTimeout(() => {
    silenceTimer = null
    if (!subs.size || backgroundMode) return
    if (Date.now() - lastFixAt > 10000) {
      void (async () => { await stopNativeWatch(); await startNativeWatch() })()
    } else {
      armSilenceWatchdog()
    }
  }, 10000)
}

async function startNativeWatch(): Promise<void> {
  // En mode arrière-plan, la source est le watcher background : jamais le foreground.
  if (backgroundMode || nativeWatchId != null || starting || !subs.size) return
  starting = true
  try {
    const perm = await ensureNativeGeoPermission()
    if (perm === 'denied') { broadcastErr({ kind: 'denied', code: 'OS-PLUG-GLOC-0003', message: 'Location permission denied' }); return }
    if (perm === 'disabled') { broadcastErr({ kind: 'disabled', code: 'OS-PLUG-GLOC-0007', message: 'Location services are not enabled' }); return }
    if (!subs.size) return
    const Geo = await plugin()
    // Seed immédiat : watchPosition peut tarder (voire ne jamais émettre à
    // l'arrêt) à livrer le 1er point sur iOS. getCurrentPosition, lui, est
    // fiable (c'est ce qui centre déjà la carte) → on diffuse un fix tout de
    // suite pour que le statut sorte de « Recherche GPS… » sans attendre. Appelé
    // AVANT le watch (aucun watch actif) → pas d'interférence CLLocationManager.
    try {
      const seed = await Geo.getCurrentPosition({ enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 })
      if (seed && subs.size) {
        const p = toW3C(seed)
        lastFix = p; lastFixAt = Date.now()
        for (const s of subs) s.onPos(p)
      }
    } catch { /* pas de fix ponctuel : le watch prendra le relais */ }
    if (!subs.size) return
    const id = await Geo.watchPosition(
      { enableHighAccuracy: true, timeout: NATIVE_WATCH_TIMEOUT_MS, maximumAge: 0 },
      (position, err) => {
        if (err) {
          const e = classifyGeoError(err)
          broadcastErr(e)
          // Le plugin a supprimé le watch (timeout) → on en relance un.
          if (e.kind === 'timeout') { nativeWatchId = null; scheduleRestart(1000) }
          return
        }
        if (!position) return
        const p = toW3C(position)
        lastFix = p
        lastFixAt = Date.now()
        for (const s of subs) s.onPos(p)
      },
    )
    nativeWatchId = id
    armSilenceWatchdog()
    if (!subs.size) await stopNativeWatch()
  } catch (e) {
    const err = classifyGeoError(e)
    broadcastErr(err)
    // Échec transitoire (plugin pas prêt, etc.) → nouvel essai.
    if (err.kind !== 'denied' && err.kind !== 'disabled') scheduleRestart(3000)
  } finally {
    starting = false
  }
}

/** Retour au premier plan : si plus aucune position récente, on relance.
 *  En mode arrière-plan, le watcher background continue de tourner (écran
 *  verrouillé inclus) : aucun redémarrage nécessaire. */
async function ensureResumeListener(): Promise<void> {
  if (resumeListener) return
  try {
    const { App } = await import('@capacitor/app')
    resumeListener = await App.addListener('appStateChange', ({ isActive }) => {
      if (!isActive || !subs.size || backgroundMode) return
      if (nativeWatchId == null || Date.now() - lastFixAt > 15000) scheduleRestart(300)
    })
  } catch { /* plugin absent */ }
}

// ── Watcher background ────────────────────────────────────────────────────
function bgToW3C(l: BgLocation): GeoPos {
  return toW3C({
    timestamp: l.time ?? Date.now(),
    coords: {
      latitude: l.latitude,
      longitude: l.longitude,
      accuracy: l.accuracy,
      altitude: l.altitude,
      altitudeAccuracy: l.altitudeAccuracy,
      heading: l.bearing,
      speed: l.speed,
    },
  })
}

async function stopBackgroundWatch(): Promise<void> {
  const id = bgWatcherId
  bgWatcherId = null
  if (id == null) return
  // Retire le watcher → arrête CLLocationManager ET la bannière iOS (batterie).
  try { await (await bgPlugin())?.removeWatcher({ id }) } catch { /* ignore */ }
}

async function startBackgroundWatch(): Promise<void> {
  if (bgWatcherId != null || bgStarting || !subs.size || !backgroundMode) return
  bgStarting = true
  try {
    const p = await bgPlugin()
    if (!p) { backgroundMode = false; void startNativeWatch(); return } // repli foreground
    if (!subs.size || !backgroundMode) return
    const id = await p.addWatcher(
      // backgroundMessage défini → suivi garanti en arrière-plan (iOS active
      // allowsBackgroundLocationUpdates et demande l'autorisation « Toujours »).
      { backgroundTitle: BG_TITLE, backgroundMessage: BG_MESSAGE, requestPermissions: true, stale: false, distanceFilter: 5 },
      (position, err) => {
        if (err) {
          broadcastErr(err.code === 'NOT_AUTHORIZED'
            ? { kind: 'denied', code: 'NOT_AUTHORIZED', message: err.message }
            : classifyGeoError(err))
          return
        }
        if (!position) return
        const p2 = bgToW3C(position)
        lastFix = p2
        lastFixAt = Date.now()
        for (const s of subs) s.onPos(p2)
      },
    )
    bgWatcherId = id
    // Désabonnement total ou bascule coupée pendant l'await → on retire aussitôt.
    if (!subs.size || !backgroundMode) await stopBackgroundWatch()
  } catch (e) {
    broadcastErr(classifyGeoError(e))
    backgroundMode = false
    void startNativeWatch()
  } finally {
    bgStarting = false
  }
}

/** Démarre la BONNE source selon le mode (une seule active à la fois). */
function startActiveWatch(): void {
  if (backgroundMode) void startBackgroundWatch()
  else void startNativeWatch()
}

function nativeSubscribe(sub: Sub): GeoHandle {
  subs.add(sub)
  // Dernière position connue (< 30 s) livrée immédiatement → statut instantané
  // quand un 2e écran s'abonne alors que le suivi tourne déjà.
  if (lastFix && Date.now() - lastFixAt < 30000) {
    const fix = lastFix
    setTimeout(() => { if (subs.has(sub)) sub.onPos(fix) }, 0)
  }
  void ensureResumeListener()
  startActiveWatch()
  return {
    clear: () => {
      if (!subs.delete(sub)) return
      if (!subs.size) {
        if (restartTimer) { clearTimeout(restartTimer); restartTimer = null }
        clearSilenceWatchdog()
        void stopNativeWatch()
        void stopBackgroundWatch()
      }
    },
  }
}

// ══════════════════════════════ API ════════════════════════════════════

export function watchPosition(onPos: (p: GeoPos) => void, onErr: (e: GeoErr) => void, opts: GeoOpts = {}): GeoHandle {
  if (isNativeApp()) return nativeSubscribe({ onPos, onErr })

  // ── WEB : navigator.geolocation ──
  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    onErr({ kind: 'unavailable', message: 'Geolocation unsupported' })
    return { clear: () => {} }
  }
  let id: number | null = null
  let gotWatchFix = false
  let cleared = false
  try {
    id = navigator.geolocation.watchPosition(
      p => { gotWatchFix = true; onPos(p) },
      e => onErr(classifyGeoError(e)),
      opts,
    )
  } catch (e) { onErr(classifyGeoError(e)) }
  // 1er point rapide : position récente en cache / réseau (basse précision),
  // livrée seulement si le watch n'a encore rien donné.
  try {
    navigator.geolocation.getCurrentPosition(
      p => { if (!cleared && !gotWatchFix) onPos(p) },
      () => { /* le watch gère les erreurs */ },
      { enableHighAccuracy: false, maximumAge: 30000, timeout: 8000 },
    )
  } catch { /* ignore */ }
  return {
    clear: () => {
      cleared = true
      if (id != null) { try { navigator.geolocation.clearWatch(id) } catch { /* ignore */ } id = null }
    },
  }
}

/**
 * Active / désactive le suivi en ARRIÈRE-PLAN (écran verrouillé / app en fond).
 * À appeler par l'écran d'enregistrement : ON au démarrage de la séance, OFF à
 * l'arrêt / sauvegarde / suppression. La source des positions bascule sous le
 * capot vers / depuis le watcher background, SANS changer l'interface d'abonnement
 * (watchPosition) : LiveShell / useGPSTracking lisent les positions à l'identique.
 *
 * Web : no-op (pas d'arrière-plan en navigateur). Retourne l'autorisation :
 * - 'denied' / 'disabled' → impossible (l'appelant gère déjà via GPSStatus.denied) ;
 * - 'granted' / 'prompt' → suivi (foreground + background) en place. NB : iOS ne
 *   distingue pas « Lorsque active » de « Toujours » via ces API ; avec « Lorsque
 *   active » l'enregistrement fonctionne app ouverte / écran verrouillé (pastille
 *   bleue), « Toujours » étant le plus fiable sur la durée.
 */
export async function setBackgroundTracking(on: boolean): Promise<GeoPermission> {
  if (!isNativeApp()) return 'unknown'
  if (backgroundMode === on) return 'granted'
  if (on) {
    // On s'assure d'abord de l'autorisation « Lorsque active » (flux existant,
    // prompt NSLocationWhenInUseUsageDescription). Le watcher background demandera
    // ensuite « Toujours » (requestPermissions). Refus franc → on reste foreground.
    const perm = await ensureNativeGeoPermission()
    if (perm === 'denied' || perm === 'disabled') return perm
    backgroundMode = true
    await stopNativeWatch()
    await startBackgroundWatch()
    return perm
  }
  backgroundMode = false
  await stopBackgroundWatch()
  startActiveWatch() // reprend le foreground tant qu'il y a des abonnés
  return 'unknown'
}

/** Position ponctuelle. En natif, servie par le hub (abonnement temporaire)
 *  pour ne JAMAIS appeler Geolocation.getCurrentPosition du plugin, dont le
 *  timeout couperait les suivis en cours. Sert aussi à déclencher le prompt. */
export function getCurrentPosition(onPos: (p: GeoPos) => void, onErr: (e: GeoErr) => void, opts: GeoOpts = {}): void {
  if (!isNativeApp()) {
    if (typeof navigator === 'undefined' || !navigator.geolocation) { onErr({ kind: 'unavailable', message: 'Geolocation unsupported' }); return }
    try { navigator.geolocation.getCurrentPosition(onPos, e => onErr(classifyGeoError(e)), opts) }
    catch (e) { onErr(classifyGeoError(e)) }
    return
  }
  let done = false
  const timeoutMs = Math.max(opts.timeout ?? 15000, 15000)
  const finish = () => { done = true; clearTimeout(timer); handle.clear() }
  const handle = nativeSubscribe({
    onPos: p => { if (done) return; finish(); onPos(p) },
    onErr: e => {
      if (done) return
      if (e.kind === 'denied' || e.kind === 'disabled') { finish(); onErr(e) }
    },
  })
  const timer = setTimeout(() => { if (!done) { finish(); onErr({ kind: 'timeout', message: 'timeout' }) } }, timeoutMs)
}
