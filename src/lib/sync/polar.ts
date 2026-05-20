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

// ── Sleep (transaction model) ──────────────────────────────────
//
// Polar AccessLink v3 sleep uses the same pull-transaction pattern
// as exercises (GET to create, not POST):
//
//  1. GET  /v3/users/{id}/sleep            → 200 {resource-uri} | 204 no new data
//  2. GET  {resource-uri}                  → list of sleep item URLs
//  3. GET  {resource-uri}/{sleep-id}       → individual night data
//  4. (upsert all rows into DB)
//  5. PUT  {resource-uri}                  → commit (marks data as read)
//
// After commit, the same nights won't appear again — idempotence is
// handled by the upsert(onConflict) on the DB side.

export async function syncPolarSleep(userId: string): Promise<number> {
  console.log('=== DÉBUT SYNC POLAR SLEEP (transaction model) ===')

  const token = await getValidToken(userId, 'polar')
  console.log('[syncPolarSleep] Token trouvé:', !!token)
  if (!token) throw new Error('No valid Polar token')

  const polarUserId = await getPolarUserId(userId)
  console.log('[syncPolarSleep] Polar user ID:', polarUserId ?? 'MANQUANT')
  if (!polarUserId) throw new Error('Polar user ID not found')

  const supabase = createServiceClient()
  const hdrs = { Authorization: `Bearer ${token}`, Accept: 'application/json' }

  // ── ÉTAPE 1 : créer la transaction ────────────────────────────
  const txUrl = `${POLAR_API}/users/${polarUserId}/sleep`
  console.log(`[syncPolarSleep] Étape 1 — GET ${txUrl}`)

  const txRes = await fetch(txUrl, { headers: hdrs })
  console.log(`[syncPolarSleep] Étape 1 — status: ${txRes.status}`)

  if (txRes.status === 204) {
    console.log('[syncPolarSleep] 204 No Content — aucune nouvelle nuit disponible')
    console.log('=== FIN SYNC POLAR SLEEP (0 nouvelles nuits) ===')
    return 0
  }

  if (!txRes.ok) {
    const errBody = await txRes.text().catch(() => '')
    console.error(`[syncPolarSleep] Étape 1 ERREUR ${txRes.status}: ${errBody.slice(0, 500)}`)
    return 0
  }

  const txBody = await txRes.text()
  console.log(`[syncPolarSleep] Étape 1 body: ${txBody.slice(0, 500)}`)

  let txData: Record<string, unknown>
  try { txData = JSON.parse(txBody) as Record<string, unknown> }
  catch { console.error('[syncPolarSleep] Étape 1 JSON parse error'); return 0 }

  // resource-uri can be at root or nested
  const resourceUri = (txData['resource-uri'] ?? txData['resourceUri']) as string | undefined
  console.log(`[syncPolarSleep] resource-uri: ${resourceUri ?? 'NON TROUVÉ'}`)
  console.log(`[syncPolarSleep] Étape 1 clés: ${Object.keys(txData).join(', ')}`)

  if (!resourceUri) {
    console.error('[syncPolarSleep] Pas de resource-uri dans la réponse — données inattendues')
    return 0
  }

  // ── ÉTAPE 2 : lister les nuits disponibles ────────────────────
  console.log(`[syncPolarSleep] Étape 2 — GET ${resourceUri}`)
  const listRes = await fetch(resourceUri, { headers: hdrs })
  console.log(`[syncPolarSleep] Étape 2 — status: ${listRes.status}`)

  if (!listRes.ok) {
    const errBody = await listRes.text().catch(() => '')
    console.error(`[syncPolarSleep] Étape 2 ERREUR ${listRes.status}: ${errBody.slice(0, 300)}`)
    return 0
  }

  const listBody = await listRes.text()
  console.log(`[syncPolarSleep] Étape 2 body: ${listBody.slice(0, 1000)}`)

  let listData: Record<string, unknown>
  try { listData = JSON.parse(listBody) as Record<string, unknown> }
  catch { console.error('[syncPolarSleep] Étape 2 JSON parse error'); return 0 }

  console.log(`[syncPolarSleep] Étape 2 clés: ${Object.keys(listData).join(', ')}`)

  // Sleep items can be under "sleep" key (array of URLs) or directly as array
  const sleepItems: string[] = Array.isArray(listData)
    ? (listData as string[])
    : ((listData['sleep'] ?? listData['nights'] ?? listData['data']) as string[] | undefined) ?? []

  console.log(`[syncPolarSleep] Nombre de nuits listées: ${sleepItems.length}`)
  if (!sleepItems.length) {
    console.log('[syncPolarSleep] Liste vide — rien à récupérer')
    return 0
  }

  // ── ÉTAPE 3 : récupérer chaque nuit ───────────────────────────
  const nights: Record<string, unknown>[] = []

  for (const itemUrl of sleepItems) {
    const url = typeof itemUrl === 'string' ? itemUrl : String(itemUrl)
    console.log(`[syncPolarSleep] Étape 3 — GET ${url}`)
    try {
      const nightRes = await fetch(url, { headers: hdrs })
      console.log(`[syncPolarSleep] Étape 3 — status: ${nightRes.status} (${url})`)
      if (!nightRes.ok) continue
      const nightData = await nightRes.json() as Record<string, unknown>
      console.log(`[syncPolarSleep] Nuit récupérée: date=${nightData['date']} score=${nightData['sleep-score']}`)
      nights.push(nightData)
    } catch (e) {
      console.error(`[syncPolarSleep] Étape 3 erreur pour ${url}:`, e instanceof Error ? e.message : String(e))
    }
  }

  console.log(`[syncPolarSleep] ${nights.length} nuits récupérées sur ${sleepItems.length}`)

  if (!nights.length) {
    console.log('[syncPolarSleep] Aucune nuit récupérée — commit quand même pour ne pas bloquer')
    await fetch(resourceUri, { method: 'PUT', headers: { Authorization: `Bearer ${token}` } }).catch(() => {})
    return 0
  }

  // Log sample
  console.log('[syncPolarSleep] Exemple nuit[0]:', JSON.stringify(nights[0]).slice(0, 600))

  // ── ÉTAPE 4 : insérer en base (avant commit) ──────────────────
  const rows = nights.map(n => ({
    user_id:            userId,
    provider:           'polar',
    provider_id:        `sleep_${n['date'] ?? n['id']}`,
    measured_at:        n['sleep-start-time'] ?? `${n['date'] ?? new Date().toISOString().split('T')[0]}T00:00:00+00:00`,
    date:               n['date'],
    data_type:          'sleep',
    sleep_duration_min: n['total-sleep-time']
      ? Math.round(parsePolarDuration(n['total-sleep-time'] as string) / 60) : null,
    sleep_score:        (n['sleep-score'] as number | undefined) ?? null,
    rem_duration_min:   n['rem-sleep']
      ? Math.round(parsePolarDuration(n['rem-sleep'] as string) / 60) : null,
    deep_duration_min:  n['deep-sleep']
      ? Math.round(parsePolarDuration(n['deep-sleep'] as string) / 60) : null,
    light_duration_min: n['light-sleep']
      ? Math.round(parsePolarDuration(n['light-sleep'] as string) / 60) : null,
    awake_duration_min: n['total-interruption-duration']
      ? Math.round(parsePolarDuration(n['total-interruption-duration'] as string) / 60) : null,
    sleep_start:        (n['sleep-start-time'] as string | undefined) ?? null,
    sleep_end:          (n['sleep-end-time'] as string | undefined) ?? null,
    raw_data:           n,
  }))

  console.log(`[syncPolarSleep] Étape 4 — upsert ${rows.length} lignes dans health_data`)
  console.log('[syncPolarSleep] Exemple row[0]:', JSON.stringify(rows[0]).slice(0, 400))

  const { error, data: upsertData } = await supabase
    .from('health_data')
    .upsert(rows, { onConflict: 'user_id,provider,date,data_type' })
    .select('id,date')

  if (error) {
    console.error('[syncPolarSleep] ERREUR UPSERT:', error.message)
    console.error('[syncPolarSleep] Détail:', JSON.stringify(error))
    // Ne pas throw ici — on veut quand même commiter pour ne pas retraiter à l'infini
    // mais on reporte l'erreur
    throw new Error(`health_data upsert: ${error.message}`)
  }

  console.log(`[syncPolarSleep] Upsert OK — ${(upsertData as unknown[])?.length ?? rows.length} lignes insérées/mises à jour`)

  // ── ÉTAPE 5 : commit la transaction ───────────────────────────
  console.log(`[syncPolarSleep] Étape 5 — PUT ${resourceUri} (commit)`)
  const commitRes = await fetch(resourceUri, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
  })
  console.log(`[syncPolarSleep] Commit status: ${commitRes.status}`)
  if (!commitRes.ok) {
    const commitErr = await commitRes.text().catch(() => '')
    console.error(`[syncPolarSleep] Commit ERREUR ${commitRes.status}: ${commitErr.slice(0, 300)}`)
    // Non bloquant — les données sont déjà en base
  }

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
