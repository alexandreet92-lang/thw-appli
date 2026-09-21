export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { googleConfigured } from '@/lib/agenda/google'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ connected: false })
  if (!googleConfigured()) return NextResponse.json({ connected: false, unavailable: true })
  const sb = createServiceClient()
  const { data } = await sb.from('google_calendar_connections').select('google_email,suppress_app_reminders').eq('user_id', user.id).maybeSingle()
  const c = data as { google_email?: string; suppress_app_reminders?: boolean } | null
  if (!c) return NextResponse.json({ connected: false })
  return NextResponse.json({ connected: true, email: c.google_email ?? null, suppressReminders: c.suppress_app_reminders !== false })
}
