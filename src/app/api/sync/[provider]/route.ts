// Vercel : runtime Node.js requis pour le sync long (backfill complet)
export const runtime     = 'nodejs'
export const maxDuration = 60

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/server'
import { syncStravaActivities, syncMissingStreams } from '@/lib/sync/strava'
import { syncWahooWorkouts } from '@/lib/sync/wahoo'
import { syncWithingsBodyMetrics, syncWithingsSleep } from '@/lib/sync/withings'
import {
  getPolarContext,
  syncPolarActivities,
  syncPolarDailyActivity,
  syncPolarPhysical,
  syncPolarSleep,
  syncPolarNightlyRecharge,
} from '@/lib/sync/polar'
import { callPolarV4, polarDateRange } from '@/lib/polar'

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
        const ctx = await getPolarContext(userId)
        if (!ctx) {
          return NextResponse.json({ error: 'No valid Polar token' }, { status: 401 })
        }
        console.log(`[sync/polar v4] START userId=${userId} token=${ctx.token.slice(0, 8)}...`)

        // Tous les appels en parallèle — fail-safe (catch individuel)
        const safeCall = async <T>(fn: () => Promise<T>, fallback: T): Promise<T> => {
          try { return await fn() } catch (e) {
            console.error('[sync/polar]', e instanceof Error ? e.message : String(e))
            return fallback
          }
        }

        const [physResult, sleepResult, rechargeResult, dailyResult, exResult] = await Promise.all([
          safeCall(() => syncPolarPhysical(userId!),        { status: 'error', resting_hr: null, weight: null }),
          safeCall(() => syncPolarSleep(userId!),           { status: 'error', nights_synced: 0 }),
          safeCall(() => syncPolarNightlyRecharge(userId!), { status: 'error', nights_synced: 0 }),
          safeCall(() => syncPolarDailyActivity(userId!),   { status: 'error', days_synced: 0 }),
          safeCall(() => syncPolarActivities(userId!),      { status: 'error', exercises_synced: 0 }),
        ])

        count = (physResult.resting_hr != null ? 1 : 0)
              + sleepResult.nights_synced
              + rechargeResult.nights_synced
              + dailyResult.days_synced
              + exResult.exercises_synced

        console.log(`[sync/polar v4] END total=${count}`)
        console.log(`  physical=${physResult.status}(hr=${physResult.resting_hr})`)
        console.log(`  sleep=${sleepResult.status}(${sleepResult.nights_synced}n)`)
        console.log(`  recharge=${rechargeResult.status}(${rechargeResult.nights_synced}n)`)
        console.log(`  daily=${dailyResult.status}(${dailyResult.days_synced}d)`)
        console.log(`  exercises=${exResult.status}(${exResult.exercises_synced}ex)`)

        // Mettre à jour last_used_at après sync réussi
        await supabase.from('oauth_tokens')
          .update({ last_used_at: new Date().toISOString() })
          .eq('user_id', userId).eq('provider', 'polar')

        if (log?.id) {
          await supabase.from('sync_logs')
            .update({ status: 'success', items_synced: count, completed_at: new Date().toISOString() })
            .eq('id', log.id)
        }

        return NextResponse.json({
          success:  true,
          synced:   count,
          physical:        { status: physResult.status,    resting_hr:      physResult.resting_hr,    weight: physResult.weight },
          sleep:           { status: sleepResult.status,   nights_synced:   sleepResult.nights_synced },
          nightly_recharge:{ status: rechargeResult.status,nights_synced:   rechargeResult.nights_synced },
          daily_activity:  { status: dailyResult.status,   days_synced:     dailyResult.days_synced },
          exercises:       { status: exResult.status,      exercises_synced:exResult.exercises_synced },
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
      await supabase.from('sync_logs')
        .update({ status: 'success', items_synced: count, completed_at: new Date().toISOString() })
        .eq('id', log.id)
    }

    return NextResponse.json({ success: true, synced: count })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    if (log?.id) {
      await supabase.from('sync_logs')
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

  // ?live=1 → teste les 5 endpoints Polar v4 (read-only)
  if (req.nextUrl.searchParams.get('live') === '1' && provider === 'polar') {

    const polarCtx = await getPolarContext(user.id)
    if (!polarCtx) return NextResponse.json({ error: 'No valid Polar token' }, { status: 400 })

    const { token } = polarCtx

    const { data: tokenRow } = await db
      .from('oauth_tokens')
      .select('scope, expires_at, last_used_at')
      .eq('user_id', user.id).eq('provider', 'polar').maybeSingle()

    const { from: from30, to } = polarDateRange(30)
    const { from: from28 }    = polarDateRange(28) // nightly-recharge : max 28 jours

    // probe : utilise callPolarV4 — même fonction que le sync réel
    async function probe(
      label: string,
      endpoint: string,
      params?: Record<string, string>,
    ): Promise<Record<string, unknown>> {
      try {
        const r    = await callPolarV4(endpoint, token, params)
        const body = await r.text()
        let parsed: unknown = null
        let count: number | null = null
        try {
          parsed = JSON.parse(body)
          if (Array.isArray(parsed)) count = parsed.length
          else if (parsed && typeof parsed === 'object') {
            const vals = Object.values(parsed as Record<string, unknown>)
            const arr = vals.find(v => Array.isArray(v))
            if (arr) count = (arr as unknown[]).length
          }
        } catch { /* raw only */ }
        return {
          label, endpoint,
          status:  r.status,
          count,
          body_raw: body.slice(0, 400),
          body_parsed: parsed,
        }
      } catch (e) {
        return { label, endpoint, status: 'FETCH_ERROR', error: String(e) }
      }
    }

    const [physProbe, sleepProbe, rechargeProbe, dailyProbe, exProbe] = await Promise.all([
      probe('1_physical_information',   'physical-information'),
      probe('2_sleeps',                 'sleeps',                        { from: from30, to }),
      probe('3_nightly_recharge',       'nightly-recharge-results',      { from: from28, to }), // 28 j max
      probe('4_daily_activity',         'daily-activity',                { from: from30, to }),
      probe('5_exercises',              'exercises',                     { from: from30, to }),
    ])

    return NextResponse.json({
      live_test:  'polar_v4_dynamic_api',
      date_range: { from: from30, to, note_recharge: `nightly-recharge uses from=${from28} (28d max)` },
      token_info: tokenRow ?? null,
      note:       '200=données | 204=rien | 401=token invalide (reconnecter) | 403=scope manquant | 404=endpoint inconnu',
      endpoints:  [physProbe, sleepProbe, rechargeProbe, dailyProbe, exProbe],
    })
  }

  // ?debug=1 → diagnostic base de données
  if (req.nextUrl.searchParams.get('debug') === '1' && provider === 'polar') {
    const [tokenRow, sleepRows, rechargeRows, physRows, actCount] = await Promise.all([
      db.from('oauth_tokens')
        .select('provider, is_active, provider_user_id, scope, expires_at, last_used_at, updated_at')
        .eq('user_id', user.id).eq('provider', 'polar').maybeSingle(),
      db.from('health_data')
        .select('id, date, data_type, sleep_duration_min, sleep_score, provider')
        .eq('user_id', user.id).eq('data_type', 'sleep')
        .order('date', { ascending: false }).limit(10),
      db.from('health_data')
        .select('id, date, raw_data')
        .eq('user_id', user.id).eq('data_type', 'nightly_recharge')
        .order('date', { ascending: false }).limit(5),
      db.from('health_data')
        .select('id, date, data_type, raw_data, provider')
        .eq('user_id', user.id).eq('data_type', 'physical')
        .order('date', { ascending: false }).limit(5),
      db.from('activities')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id).eq('provider', 'polar'),
    ])

    return NextResponse.json({
      diagnostic: 'polar_v4',
      token:                   tokenRow.data   ?? null,
      health_data_sleep:       sleepRows.data  ?? [],
      health_data_recharge:    rechargeRows.data ?? [],
      health_data_physical:    physRows.data   ?? [],
      activities_count:        actCount.count  ?? 0,
    })
  }

  // Liste les activités Polar existantes
  const { data } = await db
    .from('activities')
    .select('*')
    .eq('user_id', user.id)
    .eq('provider', provider)
    .order('started_at', { ascending: false })
    .limit(50)

  return NextResponse.json({ activities: data ?? [] })
}
