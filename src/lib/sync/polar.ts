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
  console.log('=== DÉBUT SYNC POLAR SLEEP ===')

  const token = await getValidToken(userId, 'polar')
  console.log('[syncPolarSleep] Token trouvé:', !!token)
  if (!token) throw new Error('No valid Polar token')

  const polarUserId = await getPolarUserId(userId)
  console.log('[syncPolarSleep] Polar user ID:', polarUserId ?? 'MANQUANT')
  if (!polarUserId) throw new Error('Polar user ID not found')

  const supabase = createServiceClient()

  const today = new Date().toISOString().split('T')[0]
  const from  = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  const url   = `${POLAR_API}/users/${polarUserId}/sleep?from=${from}&to=${today}`

  console.log(`[syncPolarSleep] URL appelée: ${url}`)

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
  })

  console.log(`[syncPolarSleep] Réponse API sleep - status: ${res.status}`)

  const rawBody = await res.text()
  console.log(`[syncPolarSleep] Réponse API sleep - body: ${rawBody.slice(0, 800)}`)

  if (!res.ok) {
    console.error(`[syncPolarSleep] ERREUR HTTP ${res.status}`)
    console.error(`[syncPolarSleep] Body complet: ${rawBody}`)
    return 0
  }

  let data: Record<string, unknown>
  try {
    data = JSON.parse(rawBody) as Record<string, unknown>
  } catch (e) {
    console.error('[syncPolarSleep] JSON parse error:', e)
    return 0
  }

  // Log top-level keys to understand structure
  console.log('[syncPolarSleep] Clés JSON reçues:', Object.keys(data).join(', '))
  console.log('[syncPolarSleep] JSON complet (2000c):', JSON.stringify(data).slice(0, 2000))

  // Polar v3 returns "nights" — fallback sur "data" ou tableau direct
  const nights: Record<string, unknown>[] = Array.isArray(data)
    ? (data as Record<string, unknown>[])
    : ((data['nights'] ?? data['data'] ?? data['sleep']) as Record<string, unknown>[] | undefined) ?? []

  console.log(`[syncPolarSleep] Nombre de nuits reçues: ${nights.length}`)

  if (!nights.length) {
    console.log('[syncPolarSleep] Aucune nuit — vérifie si des données existent sur Polar Flow pour les 90 derniers jours')
    console.log('[syncPolarSleep] Toutes les clés du JSON:', JSON.stringify(Object.keys(data)))
    console.log('=== FIN SYNC POLAR SLEEP (0 nuits) ===')
    return 0
  }

  // Log first night sample
  if (nights[0]) {
    console.log('[syncPolarSleep] Exemple nuit[0]:', JSON.stringify(nights[0]).slice(0, 600))
    console.log('[syncPolarSleep] Clés nuit[0]:', Object.keys(nights[0]).join(', '))
  }

  const rows = nights.map(n => ({
    user_id:            userId,
    provider:           'polar',
    provider_id:        `sleep_${n['date'] ?? n['id']}`,
    // measured_at NOT NULL — fallback sur date si sleep-start-time absent
    measured_at:        n['sleep-start-time'] ?? n['sleepStartTime'] ?? `${n['date'] ?? new Date().toISOString().split('T')[0]}T00:00:00+00:00`,
    date:               n['date'] ?? n['sleepDate'],
    data_type:          'sleep',
    sleep_duration_min: n['total-sleep-time']
      ? Math.round(parsePolarDuration(n['total-sleep-time'] as string) / 60)
      : (n['totalSleepTime'] ? Math.round(parsePolarDuration(n['totalSleepTime'] as string) / 60) : null),
    sleep_score:        n['sleep-score'] ?? n['sleepScore'] ?? null,
    rem_duration_min:   n['rem-sleep']
      ? Math.round(parsePolarDuration(n['rem-sleep'] as string) / 60)
      : (n['remSleep'] ? Math.round(parsePolarDuration(n['remSleep'] as string) / 60) : null),
    deep_duration_min:  n['deep-sleep']
      ? Math.round(parsePolarDuration(n['deep-sleep'] as string) / 60)
      : (n['deepSleep'] ? Math.round(parsePolarDuration(n['deepSleep'] as string) / 60) : null),
    light_duration_min: n['light-sleep']
      ? Math.round(parsePolarDuration(n['light-sleep'] as string) / 60)
      : (n['lightSleep'] ? Math.round(parsePolarDuration(n['lightSleep'] as string) / 60) : null),
    // awakenings = count d'éveils (integer), pas une durée
    awake_duration_min: n['total-interruption-duration']
      ? Math.round(parsePolarDuration(n['total-interruption-duration'] as string) / 60)
      : null,
    sleep_start:        n['sleep-start-time'] ?? n['sleepStartTime'] ?? null,
    sleep_end:          n['sleep-end-time'] ?? n['sleepEndTime'] ?? null,
    raw_data:           n,
  }))

  console.log(`[syncPolarSleep] Tentative upsert de ${rows.length} lignes dans health_data`)
  console.log('[syncPolarSleep] Exemple row[0]:', JSON.stringify(rows[0]).slice(0, 400))

  const { error, data: upsertData } = await supabase
    .from('health_data')
    .upsert(rows, { onConflict: 'user_id,provider,date,data_type' })
    .select('id,date')

  if (error) {
    console.error('[syncPolarSleep] ERREUR UPSERT:', error.message)
    console.error('[syncPolarSleep] Détail erreur:', JSON.stringify(error))
    throw new Error(`health_data upsert: ${error.message}`)
  }

  console.log(`[syncPolarSleep] Upsert OK — ${(upsertData as unknown[])?.length ?? rows.length} lignes`)
  console.log('=== FIN SYNC POLAR SLEEP ===')
  return rows.length
}

// ── Physical information (resting HR, max HR, weight) ──────────

export async function syncPolarPhysical(userId: string): Promise<number> {
  const token = await getValidToken(userId, 'polar')
  if (!token) throw new Error('No valid Polar token')

  const polarUserId = await getPolarUserId(userId)
  if (!polarUserId) throw new Error('Polar user ID not found')

  const supabase = createServiceClient()
  const today = new Date().toISOString().split('T')[0]

  console.log(`[syncPolarPhysical] fetching physical info for polarUser=${polarUserId}`)

  const res = await fetch(
    `${POLAR_API}/users/${polarUserId}/physical-information`,
    { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } }
  )

  console.log(`[syncPolarPhysical] status=${res.status}`)
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    console.error(`[syncPolarPhysical] error body: ${body.slice(0, 300)}`)
    return 0
  }

  const phys = await res.json() as Record<string, unknown>
  console.log(`[syncPolarPhysical] resting-heart-rate=${phys['resting-heart-rate']}, weight=${phys['weight']}`)

  const row = {
    user_id:   userId,
    provider:  'polar',
    provider_id: `physical_${today}`,
    date:      today,
    data_type: 'physical',
    raw_data:  {
      resting_hr: phys['resting-heart-rate'] ?? null,
      max_hr:     phys['maximum-heart-rate']  ?? null,
      weight_kg:  phys['weight']              ?? null,
      height_cm:  phys['height']              ?? null,
      vo2max:     phys['vo2-max']             ?? null,
    },
  }

  const { error } = await supabase
    .from('health_data')
    .upsert([row], { onConflict: 'user_id,provider,date,data_type' })

  if (error) {
    console.error(`[syncPolarPhysical] upsert error: ${error.message}`)
    return 0
  }
  return 1
}
