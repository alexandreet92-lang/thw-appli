import { createServiceClient } from '@/lib/supabase/server'
import { getValidToken } from '@/lib/oauth/tokens'

const POLAR_API = 'https://www.polaraccesslink.com/v3'

// ── Helpers ────────────────────────────────────────────────────

/** Get the numeric Polar user ID stored in oauth_tokens.provider_user_id */
async function getPolarUserId(userId: string): Promise<string | null> {
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('oauth_tokens')
    .select('provider_user_id')
    .eq('user_id', userId)
    .eq('provider', 'polar')
    .eq('is_active', true)
    .maybeSingle()
  return (data as { provider_user_id: string | null } | null)?.provider_user_id ?? null
}

/** Parse ISO-8601 duration (PT1H30M45S) → seconds */
function parsePolarDuration(iso?: string): number {
  if (!iso) return 0
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
  if (!match) return 0
  return (parseInt(match[1] ?? '0') * 3600)
       + (parseInt(match[2] ?? '0') * 60)
       + parseInt(match[3] ?? '0')
}

function mapPolarSport(sport?: string): string {
  if (!sport) return 'other'
  const s = sport.toLowerCase()
  if (s.includes('trail'))                          return 'trail_run'
  if (s.includes('running'))                        return 'run'
  if (s.includes('cycling') || s.includes('bike'))  return 'bike'
  if (s.includes('swimming'))                       return 'swim'
  if (s.includes('rowing'))                         return 'rowing'
  if (s.includes('strength') || s.includes('gym'))  return 'gym'
  if (s.includes('hyrox'))                          return 'hyrox'
  return 'other'
}

// ── Register ───────────────────────────────────────────────────

/**
 * Register the user with Polar AccessLink (mandatory before any data call).
 * Must be called once after the OAuth callback. Returns silently if already registered (409).
 */
export async function registerPolarUser(userId: string): Promise<void> {
  const token = await getValidToken(userId, 'polar')
  if (!token) throw new Error('No valid Polar token')

  const res = await fetch(`${POLAR_API}/users`, {
    method: 'POST',
    headers: {
      Authorization:  `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept:         'application/json',
    },
    body: JSON.stringify({ 'member-id': userId }),
  })

  // 409 = already registered — not an error
  if (!res.ok && res.status !== 409) {
    const err = await res.text()
    throw new Error(`Polar register error ${res.status}: ${err}`)
  }
}

// ── Activities ─────────────────────────────────────────────────

export async function syncPolarActivities(userId: string): Promise<number> {
  const token = await getValidToken(userId, 'polar')
  if (!token) throw new Error('No valid Polar token')

  const polarUserId = await getPolarUserId(userId)
  if (!polarUserId) throw new Error('Polar user ID not found — please reconnect Polar')

  const supabase = createServiceClient()

  // Create a transaction to pull new exercises
  const txRes = await fetch(`${POLAR_API}/users/${polarUserId}/exercise-transactions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
  })

  if (txRes.status === 204) return 0   // no new data
  if (!txRes.ok) {
    const msg = await txRes.text().catch(() => '')
    throw new Error(`Polar exercise-transactions error ${txRes.status}: ${msg}`)
  }

  const tx = await txRes.json()
  const txId = tx['transaction-id'] as string | undefined
  if (!txId) return 0

  // List exercises in the transaction
  const listRes = await fetch(
    `${POLAR_API}/users/${polarUserId}/exercise-transactions/${txId}`,
    { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } }
  )
  if (!listRes.ok) return 0

  const list = await listRes.json()
  const exerciseUrls: string[] = (list['exercises'] as string[] | undefined) ?? []
  if (!exerciseUrls.length) return 0

  const rows: Record<string, unknown>[] = []

  for (const url of exerciseUrls) {
    try {
      const actRes = await fetch(url, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      })
      if (!actRes.ok) continue
      const a = await actRes.json()

      rows.push({
        user_id:          userId,
        provider:         'polar',
        provider_id:      String(a.id ?? url),
        sport_type:       mapPolarSport((a['detailed-sport-info'] ?? a['sport']) as string | undefined),
        title:            (a['detailed-sport-info'] as string | undefined) ?? 'Polar Activity',
        started_at:       a['start-time'],
        elapsed_time_s:   parsePolarDuration(a.duration as string | undefined),
        moving_time_s:    parsePolarDuration(a.duration as string | undefined),
        distance_m:       a.distance ?? null,
        elevation_gain_m: a['ascent']  ?? null,
        avg_hr:           (a['heart-rate'] as Record<string,unknown> | undefined)?.['average'] ?? null,
        max_hr:           (a['heart-rate'] as Record<string,unknown> | undefined)?.['maximum'] ?? null,
        calories:         a['calories']  ?? null,
        avg_speed_ms:     (a['speed'] as Record<string,unknown> | undefined)?.['average']
                            ? ((a['speed'] as Record<string,number>)['average'] / 3.6) : null,
        max_speed_ms:     (a['speed'] as Record<string,unknown> | undefined)?.['maximum']
                            ? ((a['speed'] as Record<string,number>)['maximum'] / 3.6) : null,
        raw_data:         a,
      })
    } catch {
      // skip individual exercise on error
    }
  }

  // Commit transaction (required by Polar API)
  await fetch(`${POLAR_API}/users/${polarUserId}/exercise-transactions/${txId}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
  }).catch(() => {})

  if (!rows.length) return 0

  const { error } = await supabase
    .from('activities')
    .upsert(rows, { onConflict: 'user_id,provider,provider_id' })

  if (error) throw new Error(`activities upsert: ${error.message}`)
  return rows.length
}

// ── Sleep ──────────────────────────────────────────────────────

export async function syncPolarSleep(userId: string): Promise<number> {
  const token = await getValidToken(userId, 'polar')
  if (!token) throw new Error('No valid Polar token')

  const polarUserId = await getPolarUserId(userId)
  if (!polarUserId) throw new Error('Polar user ID not found')

  const supabase = createServiceClient()

  const today = new Date().toISOString().split('T')[0]
  const from  = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  const res = await fetch(
    `${POLAR_API}/users/${polarUserId}/sleep?from=${from}&to=${today}`,
    { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } }
  )

  if (!res.ok) return 0

  const data  = await res.json()
  const nights = (data['nights'] as Record<string, unknown>[] | undefined) ?? []
  if (!nights.length) return 0

  const rows = nights.map(n => ({
    user_id:            userId,
    provider:           'polar',
    provider_id:        `sleep_${n['date']}`,
    measured_at:        n['sleep-start-time'],
    date:               n['date'],
    data_type:          'sleep',
    sleep_duration_min: n['total-sleep-time']
      ? Math.round(parsePolarDuration(n['total-sleep-time'] as string) / 60) : null,
    sleep_score:        n['sleep-score'] ?? null,
    rem_duration_min:   n['rem-sleep']
      ? Math.round(parsePolarDuration(n['rem-sleep'] as string) / 60) : null,
    deep_duration_min:  n['deep-sleep']
      ? Math.round(parsePolarDuration(n['deep-sleep'] as string) / 60) : null,
    light_duration_min: n['light-sleep']
      ? Math.round(parsePolarDuration(n['light-sleep'] as string) / 60) : null,
    awake_duration_min: (n['awakenings'] as number | undefined) ?? null,
    sleep_start:        n['sleep-start-time'],
    sleep_end:          n['sleep-end-time'],
    raw_data:           n,
  }))

  const { error } = await supabase
    .from('health_data')
    .upsert(rows, { onConflict: 'user_id,provider,date,data_type' })

  if (error) throw new Error(`health_data upsert: ${error.message}`)
  return rows.length
}
