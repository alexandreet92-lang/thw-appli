// ══════════════════════════════════════════════════════════════
// POST   /api/push/subscribe   → enregistre l'abonnement Web Push
// DELETE /api/push/subscribe   → retire l'abonnement (par endpoint)
// GET    /api/push/subscribe   → statut (clé publique VAPID + configuré ?)
// ══════════════════════════════════════════════════════════════

export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || process.env.VAPID_PUBLIC_KEY || ''
const CONFIGURED = Boolean(PUBLIC_KEY && (process.env.VAPID_PRIVATE_KEY || ''))

export async function GET() {
  return NextResponse.json({ configured: CONFIGURED, publicKey: PUBLIC_KEY || null })
}

export async function POST(req: NextRequest) {
  try {
    const sb = await createClient()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const body = await req.json().catch(() => null) as
      | { endpoint?: string; keys?: { p256dh?: string; auth?: string } }
      | null
    const endpoint = body?.endpoint
    const p256dh   = body?.keys?.p256dh
    const auth     = body?.keys?.auth
    if (!endpoint || !p256dh || !auth) {
      return NextResponse.json({ error: 'Abonnement invalide' }, { status: 400 })
    }

    const ua = req.headers.get('user-agent') ?? null
    const { error } = await sb.from('push_subscriptions').upsert(
      { user_id: user.id, endpoint, p256dh, auth, user_agent: ua, updated_at: new Date().toISOString() },
      { onConflict: 'endpoint' },
    )
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Erreur' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const sb = await createClient()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const body = await req.json().catch(() => null) as { endpoint?: string } | null
    const endpoint = body?.endpoint
    if (!endpoint) return NextResponse.json({ error: 'endpoint requis' }, { status: 400 })

    await sb.from('push_subscriptions').delete().eq('user_id', user.id).eq('endpoint', endpoint)
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Erreur' }, { status: 500 })
  }
}
