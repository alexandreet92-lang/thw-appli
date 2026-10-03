'use client'
// ══════════════════════════════════════════════════════════════════════════
// Notifications push NATIVES (app iOS Capacitor) — APNs.
//
// Pont JS du plugin officiel @capacitor/push-notifications, obtenu via
// registerPlugin('PushNotifications') de @capacitor/core : aucune dépendance
// de COMPILATION au paquet npm (le code natif, lui, n'est embarqué dans l'app
// qu'après `npm install @capacitor/push-notifications` + `npx cap sync ios`).
// Si le plugin natif est absent, tout renvoie l'état 'unavailable'.
//
// Flux : permission → register() → évènement 'registration' (jeton APNs hex)
// → POST /api/push/native (table native_push_tokens) → l'envoi serveur passe
// par APNs HTTP/2 (src/lib/push/apns.ts).
// ══════════════════════════════════════════════════════════════════════════
import { isNativeApp, isIOS } from '@/lib/native/platform'

// ── Types minimaux du plugin (miroir de @capacitor/push-notifications v8) ──
type PermissionState = 'prompt' | 'prompt-with-rationale' | 'granted' | 'denied'
interface PermissionStatus { receive: PermissionState }
export interface NativePushNotification {
  id?: string
  title?: string
  subtitle?: string
  body?: string
  data?: Record<string, unknown>
}
interface ActionPerformed { actionId: string; notification: NativePushNotification }
interface ListenerHandle { remove: () => Promise<void> }
interface PushNotificationsPlugin {
  checkPermissions(): Promise<PermissionStatus>
  requestPermissions(): Promise<PermissionStatus>
  register(): Promise<void>
  unregister?(): Promise<void>
  removeAllDeliveredNotifications?(): Promise<void>
  addListener(event: 'registration', cb: (t: { value: string }) => void): Promise<ListenerHandle>
  addListener(event: 'registrationError', cb: (e: { error: string }) => void): Promise<ListenerHandle>
  addListener(event: 'pushNotificationReceived', cb: (n: NativePushNotification) => void): Promise<ListenerHandle>
  addListener(event: 'pushNotificationActionPerformed', cb: (a: ActionPerformed) => void): Promise<ListenerHandle>
}

export type NativePushState = 'unsupported' | 'unavailable' | 'denied' | 'off' | 'on'

const LS_TOKEN = 'thw_native_push_token'
const LS_OPTOUT = 'thw_native_push_off'

let pluginPromise: Promise<PushNotificationsPlugin | null> | null = null

/** Plugin natif, ou null (web, ou plugin non embarqué dans ce build). */
export function getPushPlugin(): Promise<PushNotificationsPlugin | null> {
  if (pluginPromise) return pluginPromise
  pluginPromise = (async () => {
    if (!isNativeApp()) return null
    try {
      const core = await import('@capacitor/core')
      if (!core.Capacitor.isPluginAvailable('PushNotifications')) return null
      return core.registerPlugin<PushNotificationsPlugin>('PushNotifications')
    } catch { return null }
  })()
  return pluginPromise
}

function lsGet(k: string): string | null { try { return localStorage.getItem(k) } catch { return null } }
function lsSet(k: string, v: string | null): void {
  try { if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v) } catch { /* ignore */ }
}

export function getStoredNativeToken(): string | null { return lsGet(LS_TOKEN) }

export async function getNativePushState(): Promise<NativePushState> {
  if (!isNativeApp()) return 'unsupported'
  const p = await getPushPlugin()
  if (!p) return 'unavailable'
  try {
    const { receive } = await p.checkPermissions()
    if (receive === 'denied') return 'denied'
    if (receive !== 'granted') return 'off'
    return lsGet(LS_OPTOUT) === '1' || !lsGet(LS_TOKEN) ? 'off' : 'on'
  } catch { return 'unavailable' }
}

// Attend le jeton APNs après register() (évènement 'registration').
async function obtainToken(p: PushNotificationsPlugin, timeoutMs = 12000): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const handles: ListenerHandle[] = []
    let done = false
    const finish = (fn: () => void) => {
      if (done) return
      done = true
      clearTimeout(to)
      handles.forEach(h => { void h.remove().catch(() => {}) })
      fn()
    }
    const to = setTimeout(() => finish(() => reject(new Error('timeout'))), timeoutMs)
    void p.addListener('registration', t => finish(() => resolve(t.value))).then(h => { if (done) void h.remove(); else handles.push(h) })
    void p.addListener('registrationError', e => finish(() => reject(new Error(e.error || 'registration_error')))).then(h => { if (done) void h.remove(); else handles.push(h) })
    p.register().catch((e: unknown) => finish(() => reject(e instanceof Error ? e : new Error('register_failed'))))
  })
}

async function saveTokenOnServer(token: string): Promise<boolean> {
  try {
    const r = await fetch('/api/push/native', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, platform: isIOS() ? 'ios' : 'android' }),
    })
    return r.ok
  } catch { return false }
}

/** Demande la permission, enregistre l'appareil et sauvegarde le jeton. */
export async function enableNativePush(): Promise<NativePushState> {
  if (!isNativeApp()) return 'unsupported'
  const p = await getPushPlugin()
  if (!p) return 'unavailable'
  try {
    let { receive } = await p.checkPermissions()
    if (receive === 'prompt' || receive === 'prompt-with-rationale') receive = (await p.requestPermissions()).receive
    if (receive === 'denied') return 'denied'
    if (receive !== 'granted') return 'off'
    const token = await obtainToken(p)
    if (!(await saveTokenOnServer(token))) return 'off'
    lsSet(LS_TOKEN, token)
    lsSet(LS_OPTOUT, null)
    return 'on'
  } catch { return 'off' }
}

/** Retire CET appareil côté serveur (les autres appareils restent notifiés). */
export async function disableNativePush(): Promise<NativePushState> {
  const token = lsGet(LS_TOKEN)
  lsSet(LS_OPTOUT, '1')
  if (token) {
    try {
      await fetch('/api/push/native', {
        method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token }),
      })
    } catch { /* best-effort */ }
  }
  lsSet(LS_TOKEN, null)
  return 'off'
}

/**
 * Au lancement : si l'utilisateur a déjà accepté (et n'a pas désactivé), on
 * ré-enregistre silencieusement — le jeton APNs peut changer (réinstallation,
 * restauration) et l'utilisateur connecté peut avoir changé.
 */
export async function refreshNativeRegistration(): Promise<void> {
  if (!isNativeApp() || lsGet(LS_OPTOUT) === '1') return
  const p = await getPushPlugin()
  if (!p) return
  try {
    const { receive } = await p.checkPermissions()
    if (receive !== 'granted') return
    const token = await obtainToken(p)
    if (await saveTokenOnServer(token)) lsSet(LS_TOKEN, token)
  } catch { /* silencieux */ }
}
