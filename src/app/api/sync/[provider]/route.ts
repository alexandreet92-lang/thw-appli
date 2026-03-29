import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/server'
import { syncStravaActivities } from '@/lib/sync/strava'
import { syncWahooWorkouts } from '@/lib/sync/wahoo'

export async function POST(
  req: NextRequest,
  { params }: { params: { provider: string } }
) {
  const { provider } = params

  // Auth : soit session cookie, soit header interne
  let userId: string | null = null

  const internalUserId = req.headers.get('x-user-id')
  if (internalUserId) {
    userId = internalUserId
  } else {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    userId = user?.id ?? null
  }

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Log la sync
  const supabase = createServiceClient()
  const { data: log } = await supabase
    .from('sync_logs')
    .insert({
      user_id:   userId,
      provider,
      sync_type: 'activities',
      status:    'running',
    })
    .select('id')
    .single()

  try {
    let count = 0

    switch (provider) {
      case 'strava':
        count = await syncStravaActivities(userId)
        break
      case 'wahoo':
        count = await syncWahooWorkouts(userId)
        break
      default:
        return NextResponse.json({ error: `Provider ${provider} not supported yet` }, { status: 400 })
    }

    // Met à jour le log
    if (log?.id) {
      await supabase
        .from('sync_logs')
        .update({ status: 'success', items_synced: count, completed_at: new Date().toISOString() })
        .eq('id', log.id)
    }

    return NextResponse.json({ success: true, synced: count })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    if (log?.id) {
      await supabase
        .from('sync_logs')
        .update({ status: 'error', error_message: msg, completed_at: new Date().toISOString() })
        .eq('id', log.id)
    }
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: { provider: string } }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = createServiceClient()
  const { data } = await db
    .from('activities')
    .select('*')
    .eq('user_id', user.id)
    .eq('provider', params.provider)
    .order('started_at', { ascending: false })
    .limit(50)

  return NextResponse.json({ activities: data ?? [] })
}
