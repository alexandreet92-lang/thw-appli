// Vercel : runtime Node.js requis pour le sync long (backfill complet)
export const runtime     = 'nodejs'
export const maxDuration = 60

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/server'
import { syncStravaActivities, syncMissingStreams } from '@/lib/sync/strava'
import { syncWahooWorkouts } from '@/lib/sync/wahoo'
import { syncWithingsBodyMetrics, syncWithingsSleep } from '@/lib/sync/withings'
import { getPolarContext, syncPolarActivities, syncPolarDailyActivity, syncPolarPhysical } from '@/lib/sync/polar'
import { callPolarAPI } from '@/lib/polar'

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
        // Vérifier le contexte (token + polarUserId) via le même chemin que le live test
        const ctx = await getPolarContext(userId)
        if (!ctx) {
          return NextResponse.json({ error: 'No valid Polar token or user ID' }, { status: 401 })
        }
        console.log(`[sync/polar] START userId=${userId} polarUserId=${ctx.polarUserId} token=${ctx.token.slice(0, 8)}...`)

        // NOTE : registerPolarUser est appelé UNE SEULE FOIS lors du callback OAuth.
        // L'appeler à chaque sync provoque des 404 sur les endpoints de données.

        // 1. Physical information (direct, pas de transaction)
        const physResult = await syncPolarPhysical(userId)
          .catch(e => { console.error('[sync/polar] physical error:', e instanceof Error ? e.message : String(e)); return { status: 'error', resting_hr: null, weight: null } })
        console.log(`[sync/polar] physical → ${physResult.status} resting_hr=${physResult.resting_hr} weight=${physResult.weight}`)

        // 2. Daily activity (transaction GET)
        const dailyResult = await syncPolarDailyActivity(userId)
          .catch(e => { console.error('[sync/polar] daily error:', e instanceof Error ? e.message : String(e)); return { status: 'error', days_synced: 0 } })
        console.log(`[sync/polar] daily → ${dailyResult.status} days=${dailyResult.days_synced}`)

        // 3. Exercises (transaction POST)
        const exResult = await syncPolarActivities(userId)
          .catch(e => { console.error('[sync/polar] exercises error:', e instanceof Error ? e.message : String(e)); return { status: 'error', exercises_synced: 0 } })
        console.log(`[sync/polar] exercises → ${exResult.status} count=${exResult.exercises_synced}`)

        count = (physResult.resting_hr != null ? 1 : 0) + dailyResult.days_synced + exResult.exercises_synced
        console.log(`[sync/polar] END total=${count}`)

        if (log?.id) {
          await supabase
            .from('sync_logs')
            .update({ status: 'success', items_synced: count, completed_at: new Date().toISOString() })
            .eq('id', log.id)
        }
        return NextResponse.json({
          success: true,
          synced:  count,
          physical:       { status: physResult.status, resting_hr: physResult.resting_hr, weight: physResult.weight },
          daily_activity: { status: dailyResult.status, days_synced: dailyResult.days_synced },
          exercises:      { status: exResult.status, exercises_synced: exResult.exercises_synced },
        })
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

  // ?live=1 → teste les 3 endpoints Polar AccessLink autorisés (read-only, pas de commit)
  if (req.nextUrl.searchParams.get('live') === '1' && provider === 'polar') {

    // ── Même chemin que le sync réel — getPolarContext + callPolarAPI ──
    const polarCtx = await getPolarContext(user.id)
    if (!polarCtx) return NextResponse.json({ error: 'No valid Polar token or user ID' }, { status: 400 })

    const { token, polarUserId: uid } = polarCtx

    // scope pour info
    const { data: tokenRow } = await db
      .from('oauth_tokens')
      .select('scope')
      .eq('user_id', user.id).eq('provider', 'polar').maybeSingle()

    // ── probe utilise callPolarAPI — exactement comme le sync réel ──
    async function probe(label: string, endpoint: string, method: 'GET' | 'POST' | 'PUT' = 'GET'): Promise<Record<string, unknown>> {
      try {
        const r = await callPolarAPI(endpoint, token, method)
        const body = await r.text()
        let parsed: unknown = null
        try { parsed = JSON.parse(body) } catch { /* raw only */ }
        const url = endpoint.startsWith('http') ? endpoint : `https://www.polaraccesslink.com${endpoint}`
        return { label, url, method, status: r.status, body_raw: body.slice(0, 600), body_parsed: parsed }
      } catch (e) {
        return { label, endpoint, method, status: 'FETCH_ERROR', error: String(e) }
      }
    }

    // 3 endpoints transaction (tous en POST — même pattern)
    const [physProbe, dailyProbe, exProbe] = await Promise.all([
      probe('1_physical_information_transactions', `/v3/users/${uid}/physical-information-transactions`, 'POST'),
      probe('2_daily_activity_transactions',       `/v3/users/${uid}/daily-activity-transactions`,       'POST'),
      probe('3_exercise_transactions',             `/v3/users/${uid}/exercise-transactions`,             'POST'),
    ])

    // Si une transaction est créée (200), lister les items (sans commit — read-only)
    async function probeList(label: string, probe: Record<string, unknown>): Promise<Record<string, unknown> | null> {
      const parsed = probe['body_parsed'] as Record<string, unknown> | null
      const txId = (parsed?.['transaction-id'] ?? parsed?.['id']) as string | undefined
      if (probe['status'] !== 200 && probe['status'] !== 201) return null
      if (!txId) return null
      const endpoint = (probe['url'] as string).replace('https://www.polaraccesslink.com', '') + `/${txId}`
      return await probe_fn(label, endpoint)
    }
    // Helper alias (probe fn is defined above in scope)
    const probe_fn = probe
    const [physListProbe, dailyListProbe] = await Promise.all([
      probeList('1b_physical_list', physProbe),
      probeList('2b_daily_list',    dailyProbe),
    ])

    return NextResponse.json({
      live_test:     'transaction_endpoints',
      polar_user_id: uid,
      scope:         (tokenRow as Record<string,unknown> | null)?.scope,
      note:          '200/201=transaction créée (txId) | 204=rien de nouveau | 404=endpoint inconnu. Tous les endpoints utilisent POST pour créer la transaction.',
      endpoints: [
        physProbe,  ...(physListProbe  ? [physListProbe]  : []),
        dailyProbe, ...(dailyListProbe ? [dailyListProbe] : []),
        exProbe,
      ],
    })
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
