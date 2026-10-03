// ══════════════════════════════════════════════════════════════
// POST /api/push/test  { title?, body?, nativeToken?, endpoint? }
// Envoie une VRAIE notification push à l'utilisateur connecté — en priorité à
// CET appareil (jeton natif / endpoint web fournis), sinon à tous ses appareils.
// Ignore volontairement les préférences par catégorie (c'est un test explicite).
// Réponse : { ok, delivered, reason?, detail } — `reason` explique l'échec :
//   apns_not_configured (variables APNS_* manquantes), no_device (aucun appareil
//   enregistré), table_missing (migration non appliquée), ou le code APNs
//   (BadDeviceToken, InvalidProviderToken, TopicDisallowed…).
// ══════════════════════════════════════════════════════════════

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendPushToUser } from '@/lib/push/send'
import { apnsMissingEnv } from '@/lib/push/apns'

const clip = (s: unknown, max: number, fallback: string): string =>
  typeof s === 'string' && s.trim() ? s.trim().slice(0, max) : fallback

export async function POST(req: NextRequest) {
  try {
    const sb = await createClient()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return NextResponse.json({ ok: false, delivered: 0, reason: 'unauthenticated' }, { status: 401 })

    const body = await req.json().catch(() => null) as
      | { title?: string; body?: string; nativeToken?: string | null; endpoint?: string | null }
      | null
    const payload = {
      title: clip(body?.title, 80, 'Notification de test'),
      body: clip(body?.body, 180, 'Tout fonctionne : tu recevras tes rappels ici.'),
      url: '/profile',
      tag: 'thw-test',
      force: true,
    }
    const nativeToken = typeof body?.nativeToken === 'string' && body.nativeToken ? body.nativeToken : null
    const endpoint = typeof body?.endpoint === 'string' && body.endpoint ? body.endpoint : null

    // 1) Cet appareil précisément ; 2) à défaut, tous les appareils du compte.
    let summary = await sendPushToUser(sb, user.id, payload, { onlyNativeToken: nativeToken, onlyEndpoint: endpoint })
    let delivered = summary.web.sent + summary.native.sent
    if (delivered === 0 && (nativeToken || endpoint) && summary.web.targets + summary.native.targets === 0) {
      summary = await sendPushToUser(sb, user.id, payload)
      delivered = summary.web.sent + summary.native.sent
    }

    let reason: string | undefined
    if (delivered === 0) {
      if (nativeToken && !summary.native.configured) reason = 'apns_not_configured'
      else if (summary.native.reasons.includes('table_missing')) reason = 'table_missing'
      else if (summary.native.reasons.length > 0) reason = summary.native.reasons[0]
      else if (summary.web.targets + summary.native.targets === 0) reason = 'no_device'
      else reason = 'not_delivered'
    }

    return NextResponse.json({
      ok: delivered > 0,
      delivered,
      reason,
      detail: { ...summary, apnsMissing: apnsMissingEnv() },
    })
  } catch (e) {
    return NextResponse.json({ ok: false, delivered: 0, reason: e instanceof Error ? e.message : 'error' }, { status: 500 })
  }
}
