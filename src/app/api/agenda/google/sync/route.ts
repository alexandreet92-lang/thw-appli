export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 120

import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { syncUser } from '@/lib/agenda/google'

// GET  = cron (CRON_SECRET) : synchronise TOUS les comptes connectés.
// POST = à la demande : synchronise le compte de l'utilisateur connecté.
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  const sb = createServiceClient()
  const { data } = await sb.from('google_calendar_connections').select('user_id')
  const ids = ((data ?? []) as { user_id: string }[]).map(r => r.user_id)
  let pulled = 0, pushed = 0
  for (const uid of ids) {
    try { const r = await syncUser(sb, uid); pulled += r.pulled; pushed += r.pushed } catch { /* best-effort */ }
  }
  return NextResponse.json({ ok: true, users: ids.length, pulled, pushed })
}

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'not_authenticated' }, { status: 401 })
  try {
    const sb = createServiceClient()
    const r = await syncUser(sb, user.id)
    return NextResponse.json({ ok: true, ...r })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
