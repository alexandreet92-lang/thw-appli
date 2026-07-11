// ══════════════════════════════════════════════════════════════
// Envoi de notifications Web Push (VAPID) côté serveur.
//
// Utilisé pour prévenir l'athlète quand le coach a fini de générer une
// réponse alors que l'app était fermée / en arrière-plan. Le service
// worker (public/sw.js) décide d'afficher ou non la notification : si un
// onglet de l'app est déjà au premier plan, il la supprime.
//
// Dégradation propre : sans clés VAPID configurées (env), tout devient
// un no-op silencieux — aucune erreur, aucun envoi.
// ══════════════════════════════════════════════════════════════

import webpush from 'web-push'
import type { SupabaseClient } from '@supabase/supabase-js'

const PUBLIC_KEY  = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || process.env.VAPID_PUBLIC_KEY || ''
const PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || ''
const SUBJECT     = process.env.VAPID_SUBJECT || 'mailto:contact@thw-coaching.app'

let configured = false
function ensureConfigured(): boolean {
  if (configured) return true
  if (!PUBLIC_KEY || !PRIVATE_KEY) return false
  try {
    webpush.setVapidDetails(SUBJECT, PUBLIC_KEY, PRIVATE_KEY)
    configured = true
    return true
  } catch {
    return false
  }
}

export function pushConfigured(): boolean {
  return Boolean(PUBLIC_KEY && PRIVATE_KEY)
}

type PushPayload = {
  title: string
  body: string
  url?: string
  convId?: string
  tag?: string
}

type SubRow = { id: string; endpoint: string; p256dh: string; auth: string }

// Envoie un push à TOUS les appareils enregistrés d'un utilisateur.
// Nettoie automatiquement les abonnements expirés (404 / 410).
export async function sendPushToUser(
  sb: SupabaseClient,
  userId: string,
  payload: PushPayload,
): Promise<void> {
  if (!ensureConfigured()) return
  let subs: SubRow[] = []
  try {
    const { data } = await sb
      .from('push_subscriptions')
      .select('id,endpoint,p256dh,auth')
      .eq('user_id', userId)
    subs = (data as SubRow[] | null) ?? []
  } catch {
    return
  }
  if (subs.length === 0) return

  const body = JSON.stringify(payload)
  const dead: string[] = []

  await Promise.all(subs.map(async (s) => {
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        body,
      )
    } catch (e) {
      const status = (e as { statusCode?: number })?.statusCode
      if (status === 404 || status === 410) dead.push(s.id)
    }
  }))

  if (dead.length > 0) {
    try { await sb.from('push_subscriptions').delete().in('id', dead) } catch { /* best-effort */ }
  }
}

// Construit un aperçu court (première ligne significative) pour le corps de
// la notification.
export function previewForBody(text: string, max = 120): string {
  const clean = text
    .replace(/```[\s\S]*?```/g, ' ')   // blocs de code
    .replace(/[#>*_`~-]/g, ' ')         // markdown léger
    .replace(/\s+/g, ' ')
    .trim()
  if (!clean) return 'Ta réponse est prête.'
  return clean.length > max ? clean.slice(0, max - 1).trimEnd() + '…' : clean
}
