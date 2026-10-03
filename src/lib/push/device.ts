'use client'
// ══════════════════════════════════════════════════════════════════════════
// Façade « notifications sur CET appareil » utilisée par Profil → Notifications.
//  • App iOS (Capacitor) → APNs natif (src/lib/push/native.ts).
//  • Web / PWA          → Web Push VAPID (src/lib/push/client.ts).
// + envoi d'une notification de TEST réelle vers l'appareil courant.
// ══════════════════════════════════════════════════════════════════════════
import { isNativeApp } from '@/lib/native/platform'
import { getPushState, enablePush, disablePush } from '@/lib/push/client'
import { getNativePushState, enableNativePush, disableNativePush, getStoredNativeToken } from '@/lib/push/native'

/**
 *  unsupported  : navigateur sans Web Push (ex. Safari iOS hors écran d'accueil)
 *  unconfigured : serveur sans clés VAPID (web uniquement)
 *  unavailable  : app native sans le plugin push embarqué (mise à jour requise)
 *  denied       : permission refusée (Réglages)
 */
export type DevicePushState = 'unsupported' | 'unconfigured' | 'unavailable' | 'denied' | 'off' | 'on'

export async function getDevicePushState(): Promise<DevicePushState> {
  return isNativeApp() ? getNativePushState() : getPushState()
}

export async function enableDevicePush(): Promise<DevicePushState> {
  return isNativeApp() ? enableNativePush() : enablePush()
}

export async function disableDevicePush(): Promise<DevicePushState> {
  return isNativeApp() ? disableNativePush() : disablePush()
}

export interface TestPushResult {
  ok: boolean
  /** Nombre d'appareils effectivement joints. */
  delivered: number
  /** Cause lisible en cas d'échec (clé courte, voir /api/push/test). */
  reason?: string
}

/** Déclenche un VRAI push vers cet appareil (et à défaut, vers tous ceux du compte). */
export async function sendTestPush(title: string, body: string): Promise<TestPushResult> {
  try {
    let endpoint: string | null = null
    if (!isNativeApp() && typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      try {
        const reg = await navigator.serviceWorker.getRegistration('/sw.js')
        const sub = reg ? await reg.pushManager.getSubscription() : null
        endpoint = sub?.endpoint ?? null
      } catch { /* ignore */ }
    }
    const r = await fetch('/api/push/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, body, nativeToken: isNativeApp() ? getStoredNativeToken() : null, endpoint }),
    })
    const j = await r.json().catch(() => null) as TestPushResult | null
    if (!r.ok || !j) return { ok: false, delivered: 0, reason: j?.reason ?? `http_${r.status}` }
    return j
  } catch {
    return { ok: false, delivered: 0, reason: 'network' }
  }
}
