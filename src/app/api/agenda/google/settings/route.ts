export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

// Réglages de la connexion Google (ex. supprimer les rappels in-app pour éviter
// les doublons avec Google Agenda).
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'not_authenticated' }, { status: 401 })
  let body: { suppressReminders?: boolean }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'bad json' }, { status: 400 }) }
  const sb = createServiceClient()
  await sb.from('google_calendar_connections').update({ suppress_app_reminders: !!body.suppressReminders, updated_at: new Date().toISOString() }).eq('user_id', user.id)
  return NextResponse.json({ ok: true })
}
