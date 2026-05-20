import { createServiceClient } from '@/lib/supabase/server'
import { getValidToken } from '@/lib/oauth/tokens'

const POLAR_API = 'https://www.polaraccesslink.com/v3'

// ── Helpers ────────────────────────────────────────────────────

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
  if (!res.ok && res.status !== 409) {
    const err = await res.text()
    throw new Error(`Polar register error ${res.status}: ${err}`)
  }
}

// ── Physical information ────────────────────────────────────────
// GET /v3/users/{id}/physical-information (direct, pas de transaction)
// Stocke dans health_data + met à jour profiles + metrics_daily

export async function syncPolarPhysical(userId: string): Promise<{
  status: string
  resting_hr: number | null
  weight: number | null
}> {
  const token = await getValidToken(userId, 'polar')
  const polarUserId = await getPolarUserId(userId)

  // ── LOGS DE COMPARAISON (identiques entre live et réel sync) ──
  console.log('=== REAL SYNC syncPolarPhysical ===')
  console.log('userId (Supabase):', userId)
  console.log('polarUserId (Polar):', polarUserId)
  console.log('token exists:', !!token, '| token length:', token?.length)
  console.log('token first 8 chars:', token?.slice(0, 8))
  const physicalUrl = `${POLAR_API}/users/${polarUserId}/physical-information`
  console.log('physicalUrl:', physicalUrl)
  // ──────────────────────────────────────────────────────────────

  if (!token) return { status: 'no_token', resting_hr: null, weight: null }
  if (!polarUserId) return { status: 'no_polar_user_id', resting_hr: null, weight: null }

  const supabase = createServiceClient()
  const today = new Date().toISOString().split('T')[0]

  const res = await fetch(physicalUrl, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
  })

  console.log(`[syncPolarPhysical] HTTP status=${res.status}`)
  const resBody = await res.text()
  console.log(`[syncPolarPhysical] response body (500c): ${resBody.slice(0, 500)}`)

  if (!res.ok) {
    return { status: `error_${res.status}`, resting_hr: null, weight: null }
  }

  let phys: Record<string, unknown>
  try { phys = JSON.parse(resBody) as Record<string, unknown> }
  catch { console.error('[syncPolarPhysical] JSON parse error'); return { status: 'json_error', resting_hr: null, weight: null } }

  const restingHr  = phys['resting-heart-rate'] != null ? Number(phys['resting-heart-rate']) : null
  const maxHr      = phys['maximum-heart-rate']  != null ? Number(phys['maximum-heart-rate'])  : null
  const weightKg   = phys['weight']              != null ? Number(phys['weight'])              : null
  const heightCm   = phys['height']              != null ? Number(phys['height'])              : null
  const vo2max     = phys['vo2-max']             != null ? Number(phys['vo2-max'])             : null

  console.log(`[syncPolarPhysical] resting_hr=${restingHr} weight=${weightKg} height=${heightCm}`)

  // 1. health_data (source primaire — lecture par PhysioSection)
  const hdRow = {
    user_id:    userId,
    provider:   'polar',
    provider_id: `physical_${today}`,
    measured_at: `${today}T12:00:00+00:00`,
    date:       today,
    data_type:  'physical',
    hr_resting: restingHr,
    weight_kg:  weightKg,
    raw_data: {
      resting_hr: restingHr,
      max_hr:     maxHr,
      weight_kg:  weightKg,
      height_cm:  heightCm,
      vo2max,
    },
  }

  const { error: hdErr } = await supabase
    .from('health_data')
    .upsert([hdRow], { onConflict: 'user_id,provider,date,data_type' })
  if (hdErr) console.error(`[syncPolarPhysical] health_data upsert error: ${hdErr.message}`)

  // 2. metrics_daily.resting_hr (utilisé par les calculs CTL/TSB)
  if (restingHr != null) {
    const { error: mdErr } = await supabase
      .from('metrics_daily')
      .upsert({ user_id: userId, date: today, resting_hr: restingHr },
               { onConflict: 'user_id,date' })
    if (mdErr) console.error(`[syncPolarPhysical] metrics_daily upsert error: ${mdErr.message}`)
  }

  // 3. profiles.weight_kg + height_cm (page Profil/Nutrition)
  const profileUpdates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (weightKg != null) profileUpdates['weight_kg'] = weightKg
  if (heightCm != null) profileUpdates['height_cm'] = heightCm

  if (Object.keys(profileUpdates).length > 1) {
    const { error: profErr } = await supabase
      .from('profiles')
      .update(profileUpdates)
      .eq('id', userId)
    if (profErr) console.error(`[syncPolarPhysical] profiles update error: ${profErr.message}`)
  }

  // 4. body_weight (historique poids)
  if (weightKg != null) {
    const { error: bwErr } = await supabase
      .from('body_weight')
      .upsert({ user_id: userId, date: today, weight_kg: weightKg },
               { onConflict: 'user_id,date' })
    if (bwErr) console.error(`[syncPolarPhysical] body_weight upsert error: ${bwErr.message}`)
  }

  return { status: 'ok', resting_hr: restingHr, weight: weightKg }
}

// ── Daily activity ─────────────────────────────────────────────
// Transaction : GET /daily-activity → resource-uri → list → details → commit
// Stocke steps, active_calories, total_calories dans health_data

export async function syncPolarDailyActivity(userId: string): Promise<{
  status: string
  days_synced: number
}> {
  const token = await getValidToken(userId, 'polar')
  const polarUserId = await getPolarUserId(userId)

  // ── LOGS DE COMPARAISON ──
  console.log('=== REAL SYNC syncPolarDailyActivity ===')
  console.log('userId (Supabase):', userId)
  console.log('polarUserId (Polar):', polarUserId)
  console.log('token exists:', !!token, '| token length:', token?.length)
  console.log('token first 8 chars:', token?.slice(0, 8))
  const dailyActivityUrl = `${POLAR_API}/users/${polarUserId}/daily-activity`
  console.log('dailyActivityUrl:', dailyActivityUrl)
  // ──────────────────────────────────────────────────────────────

  if (!token) return { status: 'no_token', days_synced: 0 }
  if (!polarUserId) return { status: 'no_polar_user_id', days_synced: 0 }

  const supabase = createServiceClient()
  const hdrs = { Authorization: `Bearer ${token}`, Accept: 'application/json' }

  // Étape 1 : créer la transaction (GET, pas POST pour daily-activity)
  const txUrl = dailyActivityUrl
  console.log(`[syncPolarDailyActivity] Étape 1 GET ${txUrl}`)
  const txRes = await fetch(txUrl, { headers: hdrs })
  console.log(`[syncPolarDailyActivity] Étape 1 status=${txRes.status}`)

  if (txRes.status === 204) {
    console.log('[syncPolarDailyActivity] 204 — aucune nouvelle activité journalière')
    return { status: 'no_new_data', days_synced: 0 }
  }
  if (!txRes.ok) {
    const body = await txRes.text().catch(() => '')
    console.error(`[syncPolarDailyActivity] Étape 1 error ${txRes.status}: ${body.slice(0, 300)}`)
    return { status: `error_${txRes.status}`, days_synced: 0 }
  }

  const txBody = await txRes.text()
  console.log(`[syncPolarDailyActivity] Étape 1 body: ${txBody.slice(0, 500)}`)

  let txData: Record<string, unknown>
  try { txData = JSON.parse(txBody) as Record<string, unknown> }
  catch { console.error('[syncPolarDailyActivity] Étape 1 JSON parse error'); return { status: 'json_error', days_synced: 0 } }

  const resourceUri = (txData['resource-uri'] ?? txData['resourceUri']) as string | undefined
  console.log(`[syncPolarDailyActivity] resource-uri: ${resourceUri ?? 'NOT_FOUND'}`)
  if (!resourceUri) return { status: 'no_resource_uri', days_synced: 0 }

  // Étape 2 : lister les jours
  console.log(`[syncPolarDailyActivity] Étape 2 GET ${resourceUri}`)
  const listRes = await fetch(resourceUri, { headers: hdrs })
  console.log(`[syncPolarDailyActivity] Étape 2 status=${listRes.status}`)
  if (!listRes.ok) return { status: `list_error_${listRes.status}`, days_synced: 0 }

  const listBody = await listRes.text()
  console.log(`[syncPolarDailyActivity] Étape 2 body: ${listBody.slice(0, 800)}`)

  let listData: Record<string, unknown>
  try { listData = JSON.parse(listBody) as Record<string, unknown> }
  catch { return { status: 'list_json_error', days_synced: 0 } }

  const activityUrls: string[] = Array.isArray(listData)
    ? (listData as string[])
    : ((listData['activity-log'] ?? listData['activities'] ?? listData['data']) as string[] | undefined) ?? []

  console.log(`[syncPolarDailyActivity] ${activityUrls.length} jours listés`)
  if (!activityUrls.length) {
    await fetch(resourceUri, { method: 'PUT', headers: { Authorization: `Bearer ${token}` } }).catch(() => {})
    return { status: 'ok', days_synced: 0 }
  }

  // Étape 3 : récupérer chaque jour
  const rows: Record<string, unknown>[] = []

  for (const url of activityUrls) {
    try {
      const dayRes = await fetch(typeof url === 'string' ? url : String(url), { headers: hdrs })
      if (!dayRes.ok) continue
      const day = await dayRes.json() as Record<string, unknown>

      const date   = (day['date'] as string | undefined) ?? ''
      const steps  = (day['active-steps'] as number | undefined) ?? null
      const actCal = (day['active-calories'] as number | undefined) ?? null
      const totCal = (day['calories'] as number | undefined) ?? null
      const durSec = day['duration'] ? parsePolarDuration(day['duration'] as string) : null

      console.log(`[syncPolarDailyActivity] jour=${date} steps=${steps} active_cal=${actCal}`)

      rows.push({
        user_id:        userId,
        provider:       'polar',
        provider_id:    `daily_${date}`,
        measured_at:    `${date}T12:00:00+00:00`,
        date,
        data_type:      'daily_activity',
        steps,
        active_calories: actCal,
        total_calories:  totCal,
        raw_data: { ...day, active_time_s: durSec },
      })
    } catch (e) {
      console.error('[syncPolarDailyActivity] erreur fetch jour:', e instanceof Error ? e.message : String(e))
    }
  }

  // Étape 4 : upsert en base (avant commit)
  if (rows.length > 0) {
    const { error } = await supabase
      .from('health_data')
      .upsert(rows, { onConflict: 'user_id,provider,date,data_type' })
    if (error) {
      console.error(`[syncPolarDailyActivity] upsert error: ${error.message}`)
      throw new Error(`daily_activity upsert: ${error.message}`)
    }
    console.log(`[syncPolarDailyActivity] ${rows.length} jours insérés/mis à jour`)
  }

  // Étape 5 : commit
  const commitRes = await fetch(resourceUri, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
  })
  console.log(`[syncPolarDailyActivity] commit status=${commitRes.status}`)

  return { status: 'ok', days_synced: rows.length }
}

// ── Exercises ──────────────────────────────────────────────────
// Transaction POST : exercise-transactions → list → details → commit
// Duplicate check : skip si activité existante même start_time ±5min

export async function syncPolarActivities(userId: string): Promise<{
  status: string
  exercises_synced: number
}> {
  const token = await getValidToken(userId, 'polar')
  if (!token) return { status: 'no_token', exercises_synced: 0 }

  const polarUserId = await getPolarUserId(userId)
  if (!polarUserId) return { status: 'no_polar_user_id', exercises_synced: 0 }

  const supabase = createServiceClient()

  // Étape 1 : créer transaction (POST pour exercises)
  const txRes = await fetch(`${POLAR_API}/users/${polarUserId}/exercise-transactions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
  })

  console.log(`[syncPolarActivities] transaction status=${txRes.status}`)

  if (txRes.status === 204) return { status: 'no_new_data', exercises_synced: 0 }
  if (!txRes.ok) {
    const msg = await txRes.text().catch(() => '')
    throw new Error(`exercise-transactions error ${txRes.status}: ${msg}`)
  }

  const tx = await txRes.json() as Record<string, unknown>
  const txId = (tx['transaction-id'] ?? tx['id']) as string | undefined
  if (!txId) return { status: 'no_tx_id', exercises_synced: 0 }

  // Étape 2 : lister les exercices
  const listRes = await fetch(
    `${POLAR_API}/users/${polarUserId}/exercise-transactions/${txId}`,
    { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } }
  )
  if (!listRes.ok) {
    await commitExerciseTx(token, polarUserId, txId)
    return { status: `list_error_${listRes.status}`, exercises_synced: 0 }
  }

  const list = await listRes.json() as Record<string, unknown>
  const exerciseUrls: string[] = (list['exercises'] as string[] | undefined) ?? []
  console.log(`[syncPolarActivities] ${exerciseUrls.length} exercices listés`)

  if (!exerciseUrls.length) {
    await commitExerciseTx(token, polarUserId, txId)
    return { status: 'ok', exercises_synced: 0 }
  }

  // Étape 3 : récupérer les exercices
  const candidates: Record<string, unknown>[] = []

  for (const url of exerciseUrls) {
    try {
      const actRes = await fetch(url, { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } })
      if (!actRes.ok) continue
      const a = await actRes.json() as Record<string, unknown>

      const startTime = (a['start-time'] as string | undefined) ?? ''
      const trainingLoad = (a['training-load'] as Record<string, unknown> | undefined)
      const tss = trainingLoad?.['sport-info-options']
        ? null
        : ((trainingLoad?.['training-load-score'] as number | undefined) ?? null)

      candidates.push({
        user_id:          userId,
        provider:         'polar',
        provider_id:      String(a.id ?? url),
        sport_type:       mapPolarSport((a['detailed-sport-info'] ?? a['sport']) as string | undefined),
        title:            (a['detailed-sport-info'] as string | undefined) ?? 'Polar Activity',
        started_at:       startTime,
        elapsed_time_s:   parsePolarDuration(a.duration as string | undefined),
        moving_time_s:    parsePolarDuration(a.duration as string | undefined),
        distance_m:       (a.distance as number | undefined) ?? null,
        elevation_gain_m: (a['ascent'] as number | undefined) ?? null,
        avg_hr:           (a['heart-rate'] as Record<string,unknown> | undefined)?.['average'] ?? null,
        max_hr:           (a['heart-rate'] as Record<string,unknown> | undefined)?.['maximum'] ?? null,
        calories:         (a['calories'] as number | undefined) ?? null,
        tss,
        avg_speed_ms: (a['speed'] as Record<string,unknown> | undefined)?.['average']
          ? Number((a['speed'] as Record<string,number>)['average']) / 3.6 : null,
        max_speed_ms: (a['speed'] as Record<string,unknown> | undefined)?.['maximum']
          ? Number((a['speed'] as Record<string,number>)['maximum']) / 3.6 : null,
        raw_data: a,
      })
    } catch (e) {
      console.error('[syncPolarActivities] fetch exercise error:', e instanceof Error ? e.message : String(e))
    }
  }

  // Duplicate check : exclure les activités dont le start_time existe déjà ±5min
  const rows: Record<string, unknown>[] = []
  if (candidates.length > 0) {
    const starts = candidates.map(c => c['started_at'] as string).filter(Boolean)
    const minDate = starts.reduce((a, b) => a < b ? a : b)
    const maxDate = starts.reduce((a, b) => a > b ? a : b)

    const { data: existing } = await supabase
      .from('activities')
      .select('started_at')
      .eq('user_id', userId)
      .gte('started_at', new Date(new Date(minDate).getTime() - 5 * 60 * 1000).toISOString())
      .lte('started_at', new Date(new Date(maxDate).getTime() + 5 * 60 * 1000).toISOString())

    const existingTimes = new Set((existing ?? []).map(r => new Date(r.started_at as string).getTime()))

    for (const c of candidates) {
      const t = new Date(c['started_at'] as string).getTime()
      const isDup = [...existingTimes].some(et => Math.abs(et - t) <= 5 * 60 * 1000)
      if (!isDup) rows.push(c)
    }

    console.log(`[syncPolarActivities] ${candidates.length} candidats → ${rows.length} après dédoublonnage`)
  }

  // Étape 4 : commit (toujours, même si 0 rows à insérer)
  await commitExerciseTx(token, polarUserId, txId)

  if (!rows.length) return { status: 'ok', exercises_synced: 0 }

  const { error } = await supabase
    .from('activities')
    .upsert(rows, { onConflict: 'user_id,provider,provider_id' })

  if (error) throw new Error(`activities upsert: ${error.message}`)
  console.log(`[syncPolarActivities] ${rows.length} exercices insérés`)
  return { status: 'ok', exercises_synced: rows.length }
}

async function commitExerciseTx(token: string, polarUserId: string, txId: string): Promise<void> {
  await fetch(`${POLAR_API}/users/${polarUserId}/exercise-transactions/${txId}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
  }).catch(() => {})
}
