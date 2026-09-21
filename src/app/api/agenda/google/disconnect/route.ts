export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

// Déconnexion Google : supprime la connexion, les événements synchronisés et
// la couche « Google » de l'utilisateur.
export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'not_authenticated' }, { status: 401 })
  const sb = createServiceClient()
  await sb.from('agenda_events').delete().eq('user_id', user.id).eq('source', 'google')
  await sb.from('agenda_calendars').delete().eq('user_id', user.id).eq('kind', 'google')
  await sb.from('google_calendar_connections').delete().eq('user_id', user.id)
  return NextResponse.json({ ok: true })
}
