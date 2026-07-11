// ══════════════════════════════════════════════════════════════
// Helpers Web Push côté client : enregistre le service worker, gère
// l'abonnement (souscription / désabonnement) et le synchronise avec le
// serveur (/api/push/subscribe). Utilisé par le réglage « Notifications ».
// ══════════════════════════════════════════════════════════════

const SW_URL = '/sw.js'

export function isPushSupported(): boolean {
  return typeof window !== 'undefined'
    && 'serviceWorker' in navigator
    && 'PushManager' in window
    && 'Notification' in window
}

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(b64)
  const out = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i)
  return out
}

async function getRegistration(): Promise<ServiceWorkerRegistration> {
  const existing = await navigator.serviceWorker.getRegistration(SW_URL)
  if (existing) return existing
  return navigator.serviceWorker.register(SW_URL)
}

// Récupère la clé publique VAPID + si le serveur est configuré pour le push.
async function fetchServerConfig(): Promise<{ configured: boolean; publicKey: string | null }> {
  try {
    const r = await fetch('/api/push/subscribe', { method: 'GET' })
    if (!r.ok) return { configured: false, publicKey: null }
    return await r.json()
  } catch {
    return { configured: false, publicKey: null }
  }
}

export type PushState = 'unsupported' | 'unconfigured' | 'denied' | 'off' | 'on'

// Vérifie l'état courant SANS rien demander à l'utilisateur.
export async function getPushState(): Promise<PushState> {
  if (!isPushSupported()) return 'unsupported'
  if (Notification.permission === 'denied') return 'denied'
  const { configured } = await fetchServerConfig()
  if (!configured) return 'unconfigured'
  try {
    const reg = await navigator.serviceWorker.getRegistration(SW_URL)
    const sub = reg ? await reg.pushManager.getSubscription() : null
    return sub ? 'on' : 'off'
  } catch {
    return 'off'
  }
}

// Active les notifications : permission → souscription → sync serveur.
// Retourne le nouvel état.
export async function enablePush(): Promise<PushState> {
  if (!isPushSupported()) return 'unsupported'

  const { configured, publicKey } = await fetchServerConfig()
  if (!configured || !publicKey) return 'unconfigured'

  const perm = Notification.permission === 'granted'
    ? 'granted'
    : await Notification.requestPermission()
  if (perm !== 'granted') return perm === 'denied' ? 'denied' : 'off'

  const reg = await getRegistration()
  await navigator.serviceWorker.ready

  let sub = await reg.pushManager.getSubscription()
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    })
  }

  const json = sub.toJSON() as { endpoint?: string; keys?: { p256dh?: string; auth?: string } }
  const res = await fetch('/api/push/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ endpoint: json.endpoint, keys: json.keys }),
  })
  if (!res.ok) return 'off'
  return 'on'
}

// Désactive les notifications : désabonne l'appareil + retire côté serveur.
export async function disablePush(): Promise<PushState> {
  if (!isPushSupported()) return 'unsupported'
  try {
    const reg = await navigator.serviceWorker.getRegistration(SW_URL)
    const sub = reg ? await reg.pushManager.getSubscription() : null
    if (sub) {
      const endpoint = sub.endpoint
      await sub.unsubscribe().catch(() => {})
      await fetch('/api/push/subscribe', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint }),
      }).catch(() => {})
    }
  } catch { /* ignore */ }
  return 'off'
}
