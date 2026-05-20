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
import { getValidToken } from '@/lib/oauth/tokens'

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
        console.log(`[sync/polar] === DÉBUT SYNC userId=${userId} ===`)
        // Ensure user is registered with Polar AccessLink (idempotent, 409 = already done)
        try {
          await registerPolarUser(userId)
          console.log('[sync/polar] registerPolarUser: OK')
        } catch (e) {
          console.log('[sync/polar] registerPolarUser:', e instanceof Error ? e.message : String(e), '(409=déjà enregistré, ignoré)')
        }
        const [pActs, pSleep, pPhys] = await Promise.all([
          syncPolarActivities(userId).catch((e) => { console.error('[sync/polar] activities ERREUR:', e instanceof Error ? e.message : String(e)); return 0 }),
          syncPolarSleep(userId).catch((e) => { console.error('[sync/polar] sleep ERREUR:', e instanceof Error ? e.message : String(e)); return 0 }),
          syncPolarPhysical(userId).catch((e) => { console.error('[sync/polar] physical ERREUR:', e instanceof Error ? e.message : String(e)); return 0 }),
        ])
        count = pActs + pSleep + pPhys
        console.log(`[sync/polar] === FIN SYNC — activities=${pActs} sleep=${pSleep} physical=${pPhys} total=${count} ===`)
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

  // ?live=1 → appel direct API Polar Sleep + retour réponse brute
  if (req.nextUrl.searchParams.get('live') === '1' && provider === 'polar') {
    const POLAR_API = 'https://www.polaraccesslink.com/v3'
    const token = await getValidToken(user.id, 'polar')
    if (!token) return NextResponse.json({ error: 'No valid Polar token' }, { status: 400 })

    // Get Polar user ID from DB
    const { data: tokenRow } = await db
      .from('oauth_tokens')
      .select('provider_user_id, expires_at, last_error, scope')
      .eq('user_id', user.id)
      .eq('provider', 'polar')
      .maybeSingle()

    const polarUserId = (tokenRow as { provider_user_id: string | null } | null)?.provider_user_id
    if (!polarUserId) return NextResponse.json({ error: 'No Polar user ID in oauth_tokens' }, { status: 400 })

    const today = new Date().toISOString().split('T')[0]
    const from  = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

    const tests: Record<string, unknown> = {
      polar_user_id: polarUserId,
      token_len:     token.length,
      scope:         tokenRow?.scope,
      date_range:    { from, to: today },
    }

    // Test 1 : GET /v3/users/{id}/sleep
    try {
      const sleepUrl = `${POLAR_API}/users/${polarUserId}/sleep?from=${from}&to=${today}`
      tests['sleep_url'] = sleepUrl
      const r = await fetch(sleepUrl, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      })
      const body = await r.text()
      tests['sleep_status'] = r.status
      tests['sleep_body_raw'] = body.slice(0, 2000)
      try { tests['sleep_body_parsed'] = JSON.parse(body) } catch { tests['sleep_body_parsed'] = 'parse_error' }
    } catch (e) { tests['sleep_error'] = String(e) }

    // Test 2 : GET /v3/users/{id} (check user registration)
    try {
      const r2 = await fetch(`${POLAR_API}/users/${polarUserId}`, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      })
      const body2 = await r2.text()
      tests['user_status'] = r2.status
      tests['user_body'] = body2.slice(0, 500)
    } catch (e) { tests['user_error'] = String(e) }

    // Test 3 : GET /v3/users/{id}/sleep/{date} — today's night specifically
    const yesterday = new Date(Date.now() - 24*60*60*1000).toISOString().split('T')[0]
    try {
      const r3 = await fetch(`${POLAR_API}/users/${polarUserId}/sleep/${yesterday}`, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      })
      const body3 = await r3.text()
      tests['sleep_single_status'] = r3.status
      tests['sleep_single_date'] = yesterday
      tests['sleep_single_body'] = body3.slice(0, 1000)
    } catch (e) { tests['sleep_single_error'] = String(e) }

    return NextResponse.json({ live_test: true, ...tests })
  }

  // ?debug=1 → diagnostic complet health_data + oauth_tokens
  if (req.nextUrl.searchParams.get('debug') === '1' && provider === 'polar') {
    const [tokenRow, sleepRows, physRows, actCount] = await Promise.all([
      db.from('oauth_tokens')
        .select('provider, is_active, provider_user_id, expires_at, last_used_at, updated_at')
        .eq('user_id', user.id)
        .eq('provider', 'polar')
        .maybeSingle(),
      db.from('health_data')
        .select('id, date, data_type, sleep_duration_min, sleep_score, provider')
        .eq('user_id', user.id)
        .eq('data_type', 'sleep')
        .order('date', { ascending: false })
        .limit(10),
      db.from('health_data')
        .select('id, date, data_type, raw_data, provider')
        .eq('user_id', user.id)
        .eq('data_type', 'physical')
        .order('date', { ascending: false })
        .limit(5),
      db.from('activities')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('provider', 'polar'),
    ])

    return NextResponse.json({
      diagnostic: 'polar',
      token: tokenRow.data ?? null,
      health_data_sleep_count: sleepRows.data?.length ?? 0,
      health_data_sleep_latest: sleepRows.data ?? [],
      health_data_physical: physRows.data ?? [],
      activities_count: actCount.count ?? 0,
      note: 'Table utilisée: health_data (pas sleep_data). data_type=sleep pour le sommeil Polar.',
    })
  }

  const { data } = await db
    .from('activities')
    .select('*')
    .eq('user_id', user.id)
    .eq('provider', provider)
    .order('started_at', { ascending: false })
    .limit(50)

  return NextResponse.json({ activities: data ?? [] })
}
