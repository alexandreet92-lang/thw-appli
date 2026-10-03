// ══════════════════════════════════════════════════════════════
// POST   /api/push/native  { token, platform? }  → enregistre le jeton APNs de
//                                                  l'iPhone pour l'utilisateur connecté
// DELETE /api/push/native  { token }             → retire ce jeton (cet appareil)
// GET    /api/push/native                        → { configured, missing[] } (diagnostic)
//
// Écriture via le client SERVICE après vérification de l'utilisateur : un même
// iPhone peut changer de compte → le jeton est réattribué au nouvel utilisateur
// (la RLS « own » empêcherait sinon de reprendre la ligne de l'ancien compte).
// Table : native_push_tokens (supabase/migrations/20261003_native_push_tokens.sql).
// ══════════════════════════════════════════════════════════════

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { apnsBundleId, apnsMissingEnv } from '@/lib/push/apns'

// Jeton APNs = 64 octets hex max aujourd'hui (32 octets) ; on reste tolérant.
const TOKEN_RE = /^[A-Za-z0-9:_\-]{32,512}$/

export async function GET() {
  const missing = apnsMissingEnv()
  return NextResponse.json({ configured: missing.length === 0, missing })
}

export async function POST(req: NextRequest) {
  try {
    const sb = await createClient()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const body = await req.json().catch(() => null) as { token?: string; platform?: string } | null
    const token = (body?.token ?? '').trim()
    if (!TOKEN_RE.test(token)) return NextResponse.json({ error: 'Jeton invalide' }, { status: 400 })
    const platform = body?.platform === 'android' ? 'android' : 'ios'

    const svc = createServiceClient()
    const now = new Date().toISOString()
    const { error } = await svc.from('native_push_tokens').upsert(
      {
        user_id: user.id, token, platform, bundle_id: apnsBundleId(),
        user_agent: req.headers.get('user-agent') ?? null, last_error: null, updated_at: now,
      },
      { onConflict: 'token' },
    )
    if (error) {
      console.error('[push/native POST]', error.message)
      return NextResponse.json({ error: 'Enregistrement impossible', detail: error.message }, { status: 500 })
    }
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

    const body = await req.json().catch(() => null) as { token?: string } | null
    const token = (body?.token ?? '').trim()
    if (!token) return NextResponse.json({ error: 'token requis' }, { status: 400 })

    await createServiceClient().from('native_push_tokens').delete().eq('user_id', user.id).eq('token', token)
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Erreur' }, { status: 500 })
  }
}
