/**
 * Polar Dynamic API v4 — fonctions de synchronisation
 *
 * Tous les endpoints v4 sont des requêtes GET directes avec plage de dates.
 * Pas de "transactions" (c'était spécifique à la v3 AccessLink).
 *
 * Endpoints :
 *   sleeps                    → health_data (data_type=sleep)
 *   nightly-recharge-results  → health_data (data_type=nightly_recharge)
 *   daily-activity            → health_data (data_type=daily_activity)
 *   exercises                 → activities
 *   physical-information      → health_data + profiles + metrics_daily
 */

import { createServiceClient } from '@/lib/supabase/server'
import { getValidToken } from '@/lib/oauth/tokens'
import { callPolarV4, polarDateRange, polarDateChunks } from '@/lib/polar'

// ── Context ────────────────────────────────────────────────────────
// v4 : pas besoin du polarUserId dans les URLs — le token suffit.

export interface PolarContext {
  token: string
}

export async function getPolarContext(userId: string): Promise<PolarContext | null> {
  const token = await getValidToken(userId, 'polar')
  if (!token) {
    console.error('[getPolarContext] aucun token Polar valide')
    return null
  }
  console.log('[getPolarContext] OK | token[0:8]:', token.slice(0, 8))
  return { token }
}

// ── Helpers ────────────────────────────────────────────────────────

function secToMin(sec: number | null | undefined): number | null {
  if (sec == null) return null
  return Math.round(sec / 60)
}

function parsePolarDuration(iso?: string): number {
  if (!iso) return 0
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
  if (!m) return 0
  return (parseInt(m[1] ?? '0') * 3600) + (parseInt(m[2] ?? '0') * 60) + parseInt(m[3] ?? '0')
}

function mapPolarSport(sport?: string): string {
  if (!sport) return 'other'
  const s = sport.toLowerCase()
  if (s.includes('trail'))                         return 'trail_run'
  if (s.includes('running'))                       return 'run'
  if (s.includes('cycling') || s.includes('bike')) return 'bike'
  if (s.includes('swimming'))                      return 'swim'
  if (s.includes('rowing'))                        return 'rowing'
  if (s.includes('strength') || s.includes('gym')) return 'gym'
  if (s.includes('hyrox'))                         return 'hyrox'
  return 'other'
}

// ── registerPolarUser — conservé pour compatibilité (ne sert plus en v4) ──
export async function registerPolarUser(_userId: string): Promise<void> {
  // La v4 n'a pas d'étape d'enregistrement — no-op
  console.log('[registerPolarUser] v4 : aucune action requise')
}

// ── 1. Sleep ───────────────────────────────────────────────────────

export async function syncPolarSleep(userId: string): Promise<{
  status: string
  nights_synced: number
}> {
  console.log('[SYNC SLEEP] START userId:', userId)

  const ctx = await getPolarContext(userId)
  if (!ctx) {
    console.log('[SYNC SLEEP] EXIT: no context')
    return { status: 'no_context', nights_synced: 0 }
  }

  // ── Étape 1 : Lister les dates de sommeil (30j max par appel) ───────
  const chunks = polarDateChunks(90, 30)
  const sleepDates = new Set<string>()

  for (const chunk of chunks) {
    const res = await callPolarV4('sleeps', ctx.token, { from: chunk.from, to: chunk.to })
    if (res.status === 204) continue
    if (!res.ok) { console.log('[SYNC SLEEP] List error', res.status, 'chunk', chunk.from); continue }

    const body = await res.text()
    let raw: unknown
    try { raw = JSON.parse(body) } catch { continue }

    const items: Record<string, unknown>[] = Array.isArray(raw)
      ? (raw as Record<string, unknown>[])
      : (((raw as Record<string, unknown>)['nightSleeps'] ??
         (raw as Record<string, unknown>)['sleeps'] ??
         (raw as Record<string, unknown>)['data']) as Record<string, unknown>[] | undefined) ?? []

    for (const item of items) {
      // La liste retourne { sleepDate: "YYYY-MM-DD" } uniquement
      const d = String(item['sleepDate'] ?? item['date'] ?? '')
      if (d) sleepDates.add(d)
    }
  }

  console.log('[SYNC SLEEP] Sleep dates found:', sleepDates.size, [...sleepDates])
  if (!sleepDates.size) return { status: 'ok', nights_synced: 0 }

  // ── Étape 2 : Insérer chaque date (l'API v4 ne retourne que la date, pas les détails) ──
  // GET /sleeps/{date} retourne 404 → la liste EST la donnée disponible
  const supabase = createServiceClient()
  const rows = [...sleepDates].map(date => ({
    user_id:     userId,
    provider:    'polar',
    provider_id: `sleep_${date}`,
    measured_at: `${date}T00:00:00Z`,
    date,
    data_type:   'sleep',
    // Métriques non disponibles via cette API (scope limité)
    sleep_duration_min: null,
    light_duration_min: null,
    deep_duration_min:  null,
    rem_duration_min:   null,
    awake_duration_min: null,
    sleep_cycles:       null,
    sleep_score:        null,
    sleep_start:        null,
    sleep_end:          null,
    raw_data:           { sleepDate: date },
  }))

  const { data: ud, error: ue } = await supabase
    .from('health_data')
    .upsert(rows, { onConflict: 'user_id,provider,date,data_type' })
    .select('id, date')

  console.log('[SYNC SLEEP] Insert result — data:', JSON.stringify(ud), 'error:', ue?.message ?? null)
  if (ue) console.error('[SYNC SLEEP] UPSERT ERROR:', ue.message)

  const inserted = ue ? 0 : rows.length
  console.log('[SYNC SLEEP] DONE — inserted:', inserted, 'nights')
  return { status: 'ok', nights_synced: inserted }
}

// ── 2. Nightly Recharge (HRV) ─────────────────────────────────────
//
// Polar v4 limite nightly-recharge-results à 28 jours par appel.
// On fait 3 appels de 28 jours pour couvrir 84 jours (~3 mois).

export async function syncPolarNightlyRecharge(userId: string): Promise<{
  status: string
  nights_synced: number
}> {
  const ctx = await getPolarContext(userId)
  if (!ctx) return { status: 'no_context', nights_synced: 0 }

  // 3 tranches de 28 jours max (contrainte API Polar)
  const chunks = polarDateChunks(84, 28)
  const allItems: Record<string, unknown>[] = []

  for (const chunk of chunks) {
    const res = await callPolarV4('nightly-recharge-results', ctx.token, { from: chunk.from, to: chunk.to })
    if (res.status === 204) continue
    if (!res.ok) {
      const body = await res.text().catch(() => '')
      console.warn(`[syncPolarNightlyRecharge] chunk ${chunk.from}→${chunk.to}: ${res.status} ${body.slice(0, 150)}`)
      continue  // non-bloquant — on continue avec les autres tranches
    }
    const raw = await res.json() as unknown
    // Essayer toutes les clés connues (camelCase et kebab-case)
    const items: Record<string, unknown>[] = Array.isArray(raw)
      ? (raw as Record<string, unknown>[])
      : (((raw as Record<string, unknown>)['nightlyRechargeResults'] ??
         (raw as Record<string, unknown>)['nightly-recharge-results'] ??
         (raw as Record<string, unknown>)['nightly_recharge_results'] ??
         (raw as Record<string, unknown>)['data']) as Record<string, unknown>[] | undefined) ?? []
    allItems.push(...items)
  }

  console.log(`[syncPolarNightlyRecharge] ${allItems.length} nuits reçues (${chunks.length} chunks)`)
  if (!allItems.length) return { status: 'ok', nights_synced: 0 }

  const supabase = createServiceClient()
  const rows = allItems.map(r => {
    // Champ date réel Polar v4 : sleepResultDate (confirmé par les logs)
    const date = String(
      r['sleepResultDate'] ??   // ← champ réel confirmé
      r['date'] ??
      r['nightDate'] ??
      ''
    )
    // HRV réel Polar v4 : meanNightlyRecoveryRmssd (confirmé : valeur 65 ms)
    const hrvRmssd      = r['meanNightlyRecoveryRmssd']       ?? r['hrvMssd'] ?? r['hrv_mssd'] ?? r['hrv']
    const rri           = r['meanNightlyRecoveryRri']         ?? null
    const ansRate       = r['ansRate']                        ?? r['ansCharge'] ?? r['ans_charge']
    const breathingRate = r['meanNightlyRecoveryRespirationInterval'] ?? r['breathingRate'] ?? r['breathing_rate']
    const recoveryInd   = r['recoveryIndicator']              ?? null
    const ansStatus     = r['ansStatus']                      ?? null
    const hrvVal        = hrvRmssd != null ? Number(hrvRmssd) : null
    console.log('[syncPolarNightlyRecharge] item date:', date, 'hrv_rmssd:', hrvVal, 'rri:', rri)
    return {
      user_id:     userId,
      provider:    'polar',
      provider_id: `polar_hrv_${date}`,
      measured_at: `${date}T00:00:00Z`,
      date,
      // 'nightly_recharge' n'est pas dans le CHECK constraint de health_data
      // → on stocke comme 'hrv' (valeur autorisée, HrvSection le lit déjà)
      data_type:   'hrv',
      raw_data: {
        hrv_rmssd:          hrvVal,   // lu par HrvSection via raw_data.hrv_rmssd
        rri_ms:             rri != null ? Number(rri) : null,
        ans_rate:           ansRate       != null ? Number(ansRate)       : null,
        breathing_rate:     breathingRate != null ? Number(breathingRate) : null,
        recovery_indicator: recoveryInd   != null ? Number(recoveryInd)  : null,
        ans_status:         ansStatus     != null ? Number(ansStatus)     : null,
        ...r,
      },
    }
  }).filter(r => {
    if (!r.date) console.log('[syncPolarNightlyRecharge] FILTERED OUT: empty date')
    return r.date
  })

  // Déduplication si plusieurs chunks se chevauchent
  const deduped = [...new Map(rows.map(r => [r.date, r])).values()]

  const { error } = await supabase
    .from('health_data')
    .upsert(deduped, { onConflict: 'user_id,provider,date,data_type' })
  if (error) console.error(`[syncPolarNightlyRecharge] upsert error: ${error.message}`)

  // metrics_daily.hrv_ms n'existe pas encore → skip (migration future)

  console.log(`[syncPolarNightlyRecharge] ${deduped.length} nuits upserted`)
  return { status: 'ok', nights_synced: deduped.length }
}

// ── 3. Daily Activity ─────────────────────────────────────────────

export async function syncPolarDailyActivity(userId: string): Promise<{
  status: string
  days_synced: number
}> {
  const ctx = await getPolarContext(userId)
  if (!ctx) return { status: 'no_context', days_synced: 0 }

  const { from, to } = polarDateRange(30)
  const res = await callPolarV4('daily-activity', ctx.token, { from, to })

  if (res.status === 204) return { status: 'no_new_data', days_synced: 0 }
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    console.error(`[syncPolarDailyActivity] ${res.status}: ${body.slice(0, 200)}`)
    return { status: `error_${res.status}`, days_synced: 0 }
  }

  const raw = await res.json() as unknown
  const items: Record<string, unknown>[] = Array.isArray(raw)
    ? (raw as Record<string, unknown>[])
    : (((raw as Record<string, unknown>)['daily-activity'] ??
       (raw as Record<string, unknown>)['data']) as Record<string, unknown>[] | undefined) ?? []

  console.log(`[syncPolarDailyActivity] ${items.length} jours reçus`)
  if (!items.length) return { status: 'ok', days_synced: 0 }

  const supabase = createServiceClient()
  const rows = items.map(d => {
    const date   = String(d['date'] ?? '')
    const steps  = d['active_steps']    != null ? Number(d['active_steps'])    : null
    const actCal = d['active_calories'] != null ? Number(d['active_calories']) : null
    const totCal = d['calories']        != null ? Number(d['calories'])        : null
    return {
      user_id:         userId,
      provider:        'polar',
      provider_id:     `daily_${date}`,
      measured_at:     `${date}T12:00:00Z`,
      date,
      data_type:       'daily_activity',
      steps,
      active_calories: actCal,
      total_calories:  totCal,
      raw_data: d,
    }
  }).filter(r => r.date)

  const { error } = await supabase
    .from('health_data')
    .upsert(rows, { onConflict: 'user_id,provider,date,data_type' })
  if (error) console.error(`[syncPolarDailyActivity] upsert error: ${error.message}`)

  return { status: 'ok', days_synced: rows.length }
}

// ── 4. Exercises ──────────────────────────────────────────────────

export async function syncPolarActivities(userId: string): Promise<{
  status: string
  exercises_synced: number
}> {
  const ctx = await getPolarContext(userId)
  if (!ctx) return { status: 'no_context', exercises_synced: 0 }

  const { from, to } = polarDateRange(90)
  const res = await callPolarV4('exercises', ctx.token, { from, to })

  if (res.status === 204) return { status: 'no_new_data', exercises_synced: 0 }
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    console.error(`[syncPolarActivities] ${res.status}: ${body.slice(0, 200)}`)
    return { status: `error_${res.status}`, exercises_synced: 0 }
  }

  const raw = await res.json() as unknown
  const items: Record<string, unknown>[] = Array.isArray(raw)
    ? (raw as Record<string, unknown>[])
    : (((raw as Record<string, unknown>)['exercises'] ??
       (raw as Record<string, unknown>)['data']) as Record<string, unknown>[] | undefined) ?? []

  console.log(`[syncPolarActivities] ${items.length} exercices reçus`)
  if (!items.length) return { status: 'ok', exercises_synced: 0 }

  const supabase = createServiceClient()
  const candidates = items.map(a => {
    const startTime = String(a['start_time'] ?? a['start-time'] ?? '')
    const hrData    = a['heart_rate'] as Record<string, unknown> | undefined
      ?? a['heart-rate'] as Record<string, unknown> | undefined
    const tss       = a['training_load'] != null ? Number(a['training_load']) : null
    return {
      user_id:          userId,
      provider:         'polar',
      provider_id:      String(a['id'] ?? a['polar_exercise_id'] ?? startTime),
      sport_type:       mapPolarSport(String(a['sport'] ?? a['detailed_sport_info'] ?? '')),
      title:            String(a['sport'] ?? a['detailed_sport_info'] ?? 'Polar Activity'),
      started_at:       startTime,
      elapsed_time_s:   parsePolarDuration(String(a['duration'] ?? '')),
      moving_time_s:    parsePolarDuration(String(a['duration'] ?? '')),
      distance_m:       a['distance'] != null ? Number(a['distance']) : null,
      elevation_gain_m: a['ascent']   != null ? Number(a['ascent'])   : null,
      avg_hr:           hrData?.['average'] != null ? Number(hrData['average']) : null,
      max_hr:           hrData?.['maximum'] != null ? Number(hrData['maximum']) : null,
      calories:         a['calories'] != null ? Number(a['calories']) : null,
      tss,
      raw_data: a,
    }
  }).filter(c => c.started_at)

  // Dédoublonnage ±5min
  if (!candidates.length) return { status: 'ok', exercises_synced: 0 }
  const starts    = candidates.map(c => c.started_at)
  const minDate   = starts.reduce((a, b) => a < b ? a : b)
  const maxDate   = starts.reduce((a, b) => a > b ? a : b)
  const { data: existing } = await supabase
    .from('activities').select('started_at').eq('user_id', userId)
    .gte('started_at', new Date(new Date(minDate).getTime() - 300_000).toISOString())
    .lte('started_at', new Date(new Date(maxDate).getTime() + 300_000).toISOString())

  const existingTimes = new Set((existing ?? []).map(r => new Date(r.started_at as string).getTime()))
  const rows = candidates.filter(c => {
    const t = new Date(c.started_at).getTime()
    return ![...existingTimes].some(et => Math.abs(et - t) <= 300_000)
  })

  console.log(`[syncPolarActivities] ${candidates.length} candidats → ${rows.length} nouveaux`)
  if (!rows.length) return { status: 'ok', exercises_synced: 0 }

  const { error } = await supabase
    .from('activities')
    .upsert(rows, { onConflict: 'user_id,provider,provider_id' })
  if (error) throw new Error(`activities upsert: ${error.message}`)

  return { status: 'ok', exercises_synced: rows.length }
}

// ── 5. Physical Information ───────────────────────────────────────

export async function syncPolarPhysical(userId: string): Promise<{
  status: string
  resting_hr: number | null
  weight: number | null
}> {
  const ctx = await getPolarContext(userId)
  if (!ctx) return { status: 'no_context', resting_hr: null, weight: null }

  const res = await callPolarV4('physical-information', ctx.token)

  if (res.status === 204) return { status: 'no_new_data', resting_hr: null, weight: null }
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    console.error(`[syncPolarPhysical] ${res.status}: ${body.slice(0, 200)}`)
    return { status: `error_${res.status}`, resting_hr: null, weight: null }
  }

  // v4 peut retourner un objet direct ou un tableau (prend le plus récent)
  const raw = await res.json() as unknown
  let phys: Record<string, unknown>
  if (Array.isArray(raw) && raw.length > 0) {
    phys = raw[raw.length - 1] as Record<string, unknown>
  } else if (raw && typeof raw === 'object') {
    phys = raw as Record<string, unknown>
  } else {
    return { status: 'empty', resting_hr: null, weight: null }
  }

  const restingHr  = phys['resting_heart_rate']  != null ? Number(phys['resting_heart_rate'])  :
                     phys['resting-heart-rate']  != null ? Number(phys['resting-heart-rate'])   : null
  const maxHr      = phys['maximum_heart_rate']  != null ? Number(phys['maximum_heart_rate'])   :
                     phys['maximum-heart-rate']  != null ? Number(phys['maximum-heart-rate'])   : null
  const weightKg   = phys['weight']              != null ? Number(phys['weight'])               : null
  const heightCm   = phys['height']              != null ? Number(phys['height'])               : null
  const vo2max     = phys['vo2_max']             != null ? Number(phys['vo2_max'])              :
                     phys['vo2-max']             != null ? Number(phys['vo2-max'])              : null

  const measuredDate = String(phys['created'] ?? phys['date'] ?? '').split('T')[0]
    || new Date().toISOString().split('T')[0]

  console.log(`[syncPolarPhysical] date=${measuredDate} resting_hr=${restingHr} weight=${weightKg}`)

  const supabase = createServiceClient()

  // health_data
  await supabase.from('health_data').upsert([{
    user_id:     userId, provider: 'polar',
    provider_id: `physical_${measuredDate}`,
    measured_at: `${measuredDate}T12:00:00Z`,
    date: measuredDate, data_type: 'physical',
    hr_resting: restingHr, weight_kg: weightKg,
    raw_data: { resting_hr: restingHr, max_hr: maxHr, weight_kg: weightKg, height_cm: heightCm, vo2max },
  }], { onConflict: 'user_id,provider,date,data_type' })
    .then(({ error }) => { if (error) console.error(`[syncPolarPhysical] health_data: ${error.message}`) })

  // metrics_daily resting_hr
  if (restingHr != null) {
    await supabase.from('metrics_daily')
      .upsert({ user_id: userId, date: measuredDate, resting_hr: restingHr }, { onConflict: 'user_id,date' })
      .then(({ error }) => { if (error) console.error(`[syncPolarPhysical] metrics_daily: ${error.message}`) })
  }

  // profiles
  const profileUpdates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (weightKg != null) profileUpdates['weight_kg'] = weightKg
  if (heightCm != null) profileUpdates['height_cm'] = heightCm
  if (Object.keys(profileUpdates).length > 1) {
    await supabase.from('profiles').update(profileUpdates).eq('id', userId)
      .then(({ error }) => { if (error) console.error(`[syncPolarPhysical] profiles: ${error.message}`) })
  }

  // body_weight
  if (weightKg != null) {
    await supabase.from('body_weight')
      .upsert({ user_id: userId, date: measuredDate, weight_kg: weightKg }, { onConflict: 'user_id,date' })
      .then(({ error }) => { if (error) console.error(`[syncPolarPhysical] body_weight: ${error.message}`) })
  }

  return { status: 'ok', resting_hr: restingHr, weight: weightKg }
}
