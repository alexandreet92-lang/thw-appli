// Vercel : runtime Node.js requis pour le sync long (backfill complet)
export const runtime     = 'nodejs'
export const maxDuration = 60

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/server'
import { syncStravaActivities, syncMissingStreams } from '@/lib/sync/strava'
import { syncWahooWorkouts } from '@/lib/sync/wahoo'
import { syncWithingsBodyMetrics, syncWithingsSleep } from '@/lib/sync/withings'
import { registerPolarUser, syncPolarActivities, syncPolarSleep, syncPolarPhysical } from '@/lib/sync/polar'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider } = await params

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
      case 'strava': {
        const streamsOnly = req.nextUrl.searchParams.get('streams') === 'true'
        if (streamsOnly) {
          count = await syncMissingStreams(userId)
        } else {
          count = await syncStravaActivities(userId)
        }
        break
      }
      case 'wahoo':
        count = await syncWahooWorkouts(userId)
        break
      case 'polar': {
        // Ensure user is registered with Polar AccessLink (idempotent, 409 = already done)
        try { await registerPolarUser(userId) } catch { /* 409 ignored */ }
        const [pActs, pSleep, pPhys] = await Promise.all([
          syncPolarActivities(userId).catch((e) => { console.error('[polar] activities:', e); return 0 }),
          syncPolarSleep(userId).catch((e) => { console.error('[polar] sleep:', e); return 0 }),
          syncPolarPhysical(userId).catch((e) => { console.error('[polar] physical:', e); return 0 }),
        ])
        count = pActs + pSleep + pPhys
        console.log(`[sync/polar] activities=${pActs} sleep=${pSleep} physical=${pPhys}`)
        break
      }
      case 'withings': {
        const [n1, n2] = await Promise.all([
          syncWithingsBodyMetrics(userId),
          syncWithingsSleep(userId),
        ])
        count = n1 + n2
        break
      }
      default:
        return NextResponse.json({ error: `Provider ${provider} not supported yet` }, { status: 400 })
    }

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
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = createServiceClient()
  const { data } = await db
    .from('activities')
    .select('*')
    .eq('user_id', user.id)
    .eq('provider', provider)
    .order('started_at', { ascending: false })
    .limit(50)

  return NextResponse.json({ activities: data ?? [] })
}
