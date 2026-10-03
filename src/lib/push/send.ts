// ══════════════════════════════════════════════════════════════
// Envoi des notifications push côté serveur, sur TOUS les appareils :
//  • Web Push (VAPID) → navigateurs / PWA (table push_subscriptions) ;
//  • APNs natif       → app iOS « Hybrid » (table native_push_tokens, apns.ts).
//
// Utilisé pour prévenir l'athlète quand le coach a fini de générer une
// réponse alors que l'app était fermée / en arrière-plan. Le service
// worker (public/sw.js) décide d'afficher ou non la notification : si un
// onglet de l'app est déjà au premier plan, il la supprime.
//
// Dégradation propre : sans clés VAPID / APNs configurées (env), le canal
// concerné devient un no-op silencieux — aucune erreur, aucun envoi.
// ══════════════════════════════════════════════════════════════

import webpush from 'web-push'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createServiceClient } from '@/lib/supabase/server'
import { sendApns, apnsConfigured, type ApnsEnv } from '@/lib/push/apns'

const PUBLIC_KEY  = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || process.env.VAPID_PUBLIC_KEY || ''
const PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || ''
const SUBJECT     = process.env.VAPID_SUBJECT || 'mailto:contact@the-hybridway.com'

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
  /** Web : affiche même si un onglet de l'app est au premier plan (test). */
  force?: boolean
}

export interface PushSendSummary {
  web: { configured: boolean; targets: number; sent: number }
  native: { configured: boolean; targets: number; sent: number; reasons: string[] }
}

export interface PushSendOptions {
  /** Restreint l'envoi natif à ce jeton (notification de test « cet appareil »). */
  onlyNativeToken?: string | null
  /** Restreint l'envoi web à cet endpoint. */
  onlyEndpoint?: string | null
}

type NativeRow = { id: string; token: string; environment: ApnsEnv | null }

// Client service pour la table native (les appelants passent parfois un
// client utilisateur : un coach ne peut pas lire les jetons de son athlète).
function serviceOr(sb: SupabaseClient): SupabaseClient {
  try { return process.env.SUPABASE_SERVICE_ROLE_KEY ? createServiceClient() : sb } catch { return sb }
}

async function sendNativeToUser(
  sb: SupabaseClient, userId: string, payload: PushPayload, opts: PushSendOptions,
): Promise<PushSendSummary['native']> {
  const out: PushSendSummary['native'] = { configured: apnsConfigured(), targets: 0, sent: 0, reasons: [] }
  const svc = serviceOr(sb)
  let rows: NativeRow[] = []
  try {
    let q = svc.from('native_push_tokens').select('id,token,environment').eq('user_id', userId)
    if (opts.onlyNativeToken) q = q.eq('token', opts.onlyNativeToken)
    const { data, error } = await q
    if (error) { out.reasons.push('table_missing'); return out }
    rows = (data as NativeRow[] | null) ?? []
  } catch { return out }
  out.targets = rows.length
  if (rows.length === 0 || !out.configured) return out

  const results = await sendApns(
    rows.map(r => ({ token: r.token, env: r.environment })),
    { title: payload.title, body: payload.body, url: payload.url ?? '/', tag: payload.tag },
  )
  const byToken = new Map(rows.map(r => [r.token, r]))
  const dead: string[] = []
  const now = new Date().toISOString()
  await Promise.all(results.map(async res => {
    const row = byToken.get(res.token)
    if (!row) return
    if (res.ok) {
      out.sent++
      try { await svc.from('native_push_tokens').update({ environment: res.env, last_success_at: now, last_error: null, updated_at: now }).eq('id', row.id) } catch { /* best-effort */ }
    } else {
      out.reasons.push(res.reason ?? `status_${res.status}`)
      if (res.dead) dead.push(row.id)
      else { try { await svc.from('native_push_tokens').update({ last_error: res.reason ?? `status_${res.status}`, updated_at: now }).eq('id', row.id) } catch { /* best-effort */ } }
    }
  }))
  if (dead.length > 0) {
    try { await svc.from('native_push_tokens').delete().in('id', dead) } catch { /* best-effort */ }
  }
  return out
}

type SubRow = { id: string; endpoint: string; p256dh: string; auth: string }

// Envoie un push à TOUS les appareils enregistrés d'un utilisateur (web + iOS).
// Nettoie automatiquement les abonnements / jetons expirés. Ne jette jamais.
export async function sendPushToUser(
  sb: SupabaseClient,
  userId: string,
  payload: PushPayload,
  opts: PushSendOptions = {},
): Promise<PushSendSummary> {
  const [web, native] = await Promise.all([
    sendWebToUser(sb, userId, payload, opts),
    sendNativeToUser(sb, userId, payload, opts).catch(() => ({ configured: apnsConfigured(), targets: 0, sent: 0, reasons: ['error'] })),
  ])
  return { web, native }
}

async function sendWebToUser(
  sb: SupabaseClient, userId: string, payload: PushPayload, opts: PushSendOptions,
): Promise<PushSendSummary['web']> {
  const out: PushSendSummary['web'] = { configured: pushConfigured(), targets: 0, sent: 0 }
  if (!ensureConfigured()) return out
  let subs: SubRow[] = []
  try {
    let q = sb
      .from('push_subscriptions')
      .select('id,endpoint,p256dh,auth')
      .eq('user_id', userId)
    if (opts.onlyEndpoint) q = q.eq('endpoint', opts.onlyEndpoint)
    const { data } = await q
    subs = (data as SubRow[] | null) ?? []
  } catch {
    return out
  }
  out.targets = subs.length
  if (subs.length === 0) return out

  const body = JSON.stringify(payload)
  const dead: string[] = []

  await Promise.all(subs.map(async (s) => {
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        body,
      )
      out.sent++
    } catch (e) {
      const status = (e as { statusCode?: number })?.statusCode
      if (status === 404 || status === 410) dead.push(s.id)
    }
  }))

  if (dead.length > 0) {
    try { await sb.from('push_subscriptions').delete().in('id', dead) } catch { /* best-effort */ }
  }
  return out
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
