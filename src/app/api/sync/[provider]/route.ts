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

  // ?live=1 → sonde tous les endpoints Polar pertinents, retourne status + body brut
  if (req.nextUrl.searchParams.get('live') === '1' && provider === 'polar') {
    const BASE = 'https://www.polaraccesslink.com/v3'
    const token = await getValidToken(user.id, 'polar')
    if (!token) return NextResponse.json({ error: 'No valid Polar token' }, { status: 400 })

    const { data: tokenRow } = await db
      .from('oauth_tokens')
      .select('provider_user_id, scope')
      .eq('user_id', user.id).eq('provider', 'polar').maybeSingle()

    const uid = (tokenRow as { provider_user_id: string | null } | null)?.provider_user_id
    if (!uid) return NextResponse.json({ error: 'No Polar user ID' }, { status: 400 })

    const hdrs = { Authorization: `Bearer ${token}`, Accept: 'application/json' }

    async function probe(label: string, url: string): Promise<Record<string, unknown>> {
      try {
        const r = await fetch(url, { headers: hdrs })
        const body = await r.text()
        let parsed: unknown = null
        try { parsed = JSON.parse(body) } catch { /* raw only */ }
        return { label, url, status: r.status, body_raw: body.slice(0, 500), body_parsed: parsed }
      } catch (e) {
        return { label, url, status: 'FETCH_ERROR', error: String(e) }
      }
    }

    // Run all probes in parallel
    const probes = await Promise.all([
      probe('1_sleep',                `${BASE}/users/${uid}/sleep`),
      probe('2_nightly_recharge',     `${BASE}/users/${uid}/nightly-recharge`),
      probe('3_physical_information', `${BASE}/users/${uid}/physical-information`),
      probe('4_daily_activity',       `${BASE}/users/${uid}/daily-activity`),
      probe('5_exercise_transactions',`${BASE}/users/${uid}/exercise-transactions`),
    ])

    // For sleep: if 200, follow resource-uri one level deeper (read-only, no commit)
    const sleepProbe = probes[0]
    if (sleepProbe['status'] === 200) {
      const parsed = sleepProbe['body_parsed'] as Record<string, unknown> | null
      const resUri = parsed?.['resource-uri'] as string | undefined
      if (resUri) {
        const listProbe = await probe('1b_sleep_list', resUri)
        probes.splice(1, 0, listProbe)
      }
    }

    return NextResponse.json({
      live_test:    'endpoint_survey',
      polar_user_id: uid,
      scope:        (tokenRow as Record<string,unknown> | null)?.scope,
      note:         'READ-ONLY — aucun commit. 200=données dispo, 204=rien de nouveau, 404=endpoint non supporté par ce compte/montre.',
      endpoints:    probes,
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
