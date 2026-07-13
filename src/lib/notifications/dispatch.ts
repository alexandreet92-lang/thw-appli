// ══════════════════════════════════════════════════════════════
// Moteur central des notifications.
//
// notifyUser(userId, key, payload) :
//   1. lit les préférences de l'utilisateur (global + par catégorie) ;
//   2. respecte le toggle (et le défaut si jamais réglé) ;
//   3. crée la notification IN-APP (cloche, table `notifications`) ;
//   4. envoie le push sur tous ses appareils (Web Push).
//
// Utilisable partout côté serveur (routes API, webhooks, cron). L'in-app
// marche même sans push configuré ; le push est best-effort par-dessus.
// ══════════════════════════════════════════════════════════════

import { createServiceClient } from '@/lib/supabase/server'
import { sendPushToUser } from '@/lib/push/send'
import { createNotification, createNotificationOnce } from '@/lib/notifications/create'
import { defaultFor, type NotifKey } from '@/lib/notifications/catalog'

type NotifyPayload = {
  title: string
  body: string
  url?: string
  // Clé de déduplication (jalon « J-7 », rappel du jour…). Recommandé.
  dedupKey?: string
  // true → insère une seule fois pour ce dedupKey (jalon one-shot).
  once?: boolean
}

// Renvoie true si l'utilisateur accepte cette catégorie de notification.
export async function isNotifEnabled(userId: string, key: NotifKey): Promise<boolean> {
  try {
    const sb = createServiceClient()
    const { data } = await sb
      .from('user_notification_preferences')
      .select('global_enabled, preferences')
      .eq('user_id', userId)
      .maybeSingle()
    if (data?.global_enabled === false) return false
    const prefs = (data?.preferences as Record<string, boolean> | null) ?? {}
    return prefs[key] ?? defaultFor(key)
  } catch {
    return defaultFor(key)
  }
}

// Notifie UN utilisateur pour une catégorie donnée (respecte ses réglages).
// Écrit la notif in-app (cloche) PUIS envoie le push. Best-effort de bout en bout.
export async function notifyUser(userId: string, key: NotifKey, payload: NotifyPayload): Promise<void> {
  if (!(await isNotifEnabled(userId, key))) return
  const sb = createServiceClient()

  // 1. In-app (cloche) — visible même sans push configuré / sans appareil.
  const inApp = { type: key, title: payload.title, body: payload.body, link: payload.url, dedupKey: payload.dedupKey }
  if (payload.once) await createNotificationOnce(sb, userId, inApp)
  else await createNotification(sb, userId, inApp)

  // 2. Push Web (best-effort) — no-op si non configuré / aucun appareil.
  await sendPushToUser(sb, userId, {
    title: payload.title,
    body: payload.body,
    url: payload.url ?? '/',
    tag: payload.dedupKey ?? key,
  })
}

// Notifie plusieurs utilisateurs (cron) — chacun filtré par ses réglages.
export async function notifyUsers(userIds: string[], key: NotifKey, payload: NotifyPayload): Promise<void> {
  await Promise.all(userIds.map((id) => notifyUser(id, key, payload).catch(() => {})))
}
