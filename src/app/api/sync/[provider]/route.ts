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

  // ?live=1 → test live du flux transactionnel Polar Sleep (lecture seule, pas de commit)
  if (req.nextUrl.searchParams.get('live') === '1' && provider === 'polar') {
    const POLAR_API_BASE = 'https://www.polaraccesslink.com/v3'
    const token = await getValidToken(user.id, 'polar')
    if (!token) return NextResponse.json({ error: 'No valid Polar token' }, { status: 400 })

    const { data: tokenRow } = await db
      .from('oauth_tokens')
      .select('provider_user_id, expires_at, last_error, scope')
      .eq('user_id', user.id)
      .eq('provider', 'polar')
      .maybeSingle()

    const polarUserId = (tokenRow as { provider_user_id: string | null } | null)?.provider_user_id
    if (!polarUserId) return NextResponse.json({ error: 'No Polar user ID in oauth_tokens' }, { status: 400 })

    const hdrs = { Authorization: `Bearer ${token}`, Accept: 'application/json' }
    const result: Record<string, unknown> = {
      polar_user_id: polarUserId,
      token_len:     token.length,
      scope:         (tokenRow as Record<string,unknown> | null)?.scope,
    }

    // Test A : vérif compte utilisateur
    try {
      const rU = await fetch(`${POLAR_API_BASE}/users/${polarUserId}`, { headers: hdrs })
      const bU = await rU.text()
      result['step_A_user_status'] = rU.status
      result['step_A_user_body']   = bU.slice(0, 300)
    } catch (e) { result['step_A_error'] = String(e) }

    // Test B : GET /sleep sans params → créer transaction (lecture seule ici)
    const sleepTxUrl = `${POLAR_API_BASE}/users/${polarUserId}/sleep`
    result['step_B_url'] = sleepTxUrl
    try {
      const rTx = await fetch(sleepTxUrl, { headers: hdrs })
      const bTx = await rTx.text()
      result['step_B_status'] = rTx.status
      result['step_B_body_raw'] = bTx.slice(0, 1000)
      if (rTx.status === 204) {
        result['step_B_interpretation'] = 'NO_NEW_DATA — aucune nuit non-commitée disponible'
      } else if (rTx.ok) {
        try {
          const parsed = JSON.parse(bTx) as Record<string, unknown>
          result['step_B_body_parsed'] = parsed
          result['step_B_resource_uri'] = parsed['resource-uri'] ?? parsed['resourceUri'] ?? 'NOT_FOUND'

          // Test C : si resource-uri trouvé, lister les nuits (sans commit)
          const resUri = (parsed['resource-uri'] ?? parsed['resourceUri']) as string | undefined
          if (resUri) {
            result['step_C_url'] = resUri
            const rList = await fetch(resUri, { headers: hdrs })
            const bList = await rList.text()
            result['step_C_status'] = rList.status
            result['step_C_body_raw'] = bList.slice(0, 2000)
            try { result['step_C_body_parsed'] = JSON.parse(bList) } catch { /* ignore */ }
          }
        } catch { result['step_B_body_parsed'] = 'json_parse_error' }
      } else {
        result['step_B_interpretation'] = `ERREUR HTTP ${rTx.status}`
      }
    } catch (e) { result['step_B_error'] = String(e) }

    result['note'] = 'Test READ-ONLY — aucun commit effectué. Relance un vrai sync après ce test.'
    return NextResponse.json({ live_test: 'transaction_model', ...result })
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
