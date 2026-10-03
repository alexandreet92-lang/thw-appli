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
let resumeListener: { remove: () => Promise<void> } | null = null

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

async function startNativeWatch(): Promise<void> {
  if (nativeWatchId != null || starting || !subs.size) return
  starting = true
  try {
    const perm = await ensureNativeGeoPermission()
    if (perm === 'denied') { broadcastErr({ kind: 'denied', code: 'OS-PLUG-GLOC-0003', message: 'Location permission denied' }); return }
    if (perm === 'disabled') { broadcastErr({ kind: 'disabled', code: 'OS-PLUG-GLOC-0007', message: 'Location services are not enabled' }); return }
    if (!subs.size) return
    const Geo = await plugin()
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

/** Retour au premier plan : si plus aucune position récente, on relance. */
async function ensureResumeListener(): Promise<void> {
  if (resumeListener) return
  try {
    const { App } = await import('@capacitor/app')
    resumeListener = await App.addListener('appStateChange', ({ isActive }) => {
      if (!isActive || !subs.size) return
      if (nativeWatchId == null || Date.now() - lastFixAt > 15000) scheduleRestart(300)
    })
  } catch { /* plugin absent */ }
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
  void startNativeWatch()
  return {
    clear: () => {
      if (!subs.delete(sub)) return
      if (!subs.size) {
        if (restartTimer) { clearTimeout(restartTimer); restartTimer = null }
        void stopNativeWatch()
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
