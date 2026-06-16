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
import { triggerRecordsProcessing } from '@/lib/records/triggerRecordsProcessing'

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

// ── Helpers de parsing sommeil ──────────────────────────────────────
// Renvoie la première clé présente (non-null) parmi `keys`.
function pick(obj: Record<string, unknown>, keys: string[]): unknown {
  for (const k of keys) if (obj[k] != null) return obj[k]
  return null
}

// Durée Polar → minutes. Accepte : secondes (number), ISO-8601 'PT..' (string),
// ou nombre en string (interprété en secondes). Null si inexploitable.
function durToMin(v: unknown): number | null {
  if (v == null) return null
  if (typeof v === 'number') return Number.isFinite(v) ? Math.round(v / 60) : null
  if (typeof v === 'string') {
    const t = v.trim()
    if (/^P/i.test(t)) { const sec = parsePolarDuration(t); return sec ? Math.round(sec / 60) : null }
    const n = Number(t)
    return Number.isFinite(n) ? Math.round(n / 60) : null
  }
  return null
}

function numOrNull(v: unknown): number | null {
  if (v == null) return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

function isoOrNull(v: unknown): string | null {
  if (v == null) return null
  const d = new Date(String(v))
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
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

  // ── Lister les nuits de sommeil (28j max par appel) sur ~3 mois ─────
  const chunks = polarDateChunks(84, 28)
  const nightsByDate = new Map<string, Record<string, unknown>>()
  let loggedRaw = false

  for (const chunk of chunks) {
    const res = await callPolarV4('sleeps', ctx.token, { from: chunk.from, to: chunk.to })
    if (res.status === 204) continue
    if (!res.ok) { console.log('[SLEEP] List error', res.status, 'chunk', chunk.from); continue }

    const body = await res.text()

    // ── Log brut COMPLET une seule fois (noms de champs réels Polar) ──
    if (!loggedRaw) {
      console.log(`[SLEEP RAW] GET /v4/data/sleeps?from=${chunk.from}&to=${chunk.to} → ${res.status}`)
      console.log('[SLEEP RAW BODY]', body)   // non tronqué — volontaire pour le diagnostic
      loggedRaw = true
    }

    let raw: unknown
    try { raw = JSON.parse(body) } catch { continue }

    const items: Record<string, unknown>[] = Array.isArray(raw)
      ? (raw as Record<string, unknown>[])
      : (((raw as Record<string, unknown>)['nightSleeps'] ??
         (raw as Record<string, unknown>)['sleeps'] ??
         (raw as Record<string, unknown>)['data']) as Record<string, unknown>[] | undefined) ?? []

    for (const item of items) {
      const d = String(pick(item, ['sleepDate', 'date']) ?? '')
      if (d) nightsByDate.set(d, item)   // dédoublonnage par date
    }
  }

  const nights = [...nightsByDate.entries()].map(([date, raw]) => ({ date, raw }))
  console.log('[SLEEP] nights received:', nights.length)

  if (!nights.length) return { status: 'ok', nights_synced: 0 }

  const supabase = createServiceClient()

  // ── Mapping des vraies métriques (sleepNightSleep) → colonnes ───────
  // Noms candidats : on couvre camelCase (v4) ET snake_case (v3) ; les noms
  // exacts sont confirmés par [SLEEP RAW BODY] ci-dessus et ajustés au besoin.
  const rows = nights.map(({ date, raw }) => {
    // Les phases peuvent être imbriquées (phaseDurations) ou à plat sur la nuit.
    const phases = (pick(raw, ['phaseDurations', 'sleepPhaseDurations', 'phases']) as Record<string, unknown> | null) ?? raw

    const deep  = durToMin(pick(phases, ['deepSleep', 'deep_sleep', 'deepDuration', 'deep']))
    const light = durToMin(pick(phases, ['lightSleep', 'light_sleep', 'lightDuration', 'light']))
    const rem   = durToMin(pick(phases, ['remSleep', 'rem_sleep', 'remDuration', 'rem']))
    const awake = durToMin(pick(phases, ['awake', 'wake', 'awakeDuration', 'wakeDuration']))

    // Durée totale : champ dédié sinon somme des phases connues.
    let durationMin = durToMin(pick(raw, ['sleepDuration', 'totalSleepDuration', 'sleep_duration', 'duration']))
    if (durationMin == null) {
      const parts = [deep, light, rem].filter((x): x is number => x != null)
      durationMin = parts.length ? parts.reduce((a, b) => a + b, 0) : null
    }

    // Score : champ direct ou imbriqué (sleepScoreData.score).
    const scoreObj   = pick(raw, ['sleepScoreData', 'scoreData', 'sleepScore']) as Record<string, unknown> | number | null
    const scoreRaw   = typeof scoreObj === 'object' && scoreObj != null
      ? pick(scoreObj, ['score', 'sleepScore', 'value'])
      : pick(raw, ['sleepScore', 'sleep_score', 'score'])
    const scoreNum   = numOrNull(scoreRaw)

    const start      = isoOrNull(pick(raw, ['sleepStartTime', 'sleep_start_time', 'sleepStart', 'startTime']))
    const end        = isoOrNull(pick(raw, ['sleepEndTime', 'sleep_end_time', 'sleepEnd', 'endTime']))
    const efficiency = numOrNull(pick(raw, ['sleepEfficiency', 'sleep_efficiency', 'efficiencyPercent', 'efficiency']))
    const latency    = durToMin(pick(raw, ['sleepLatency', 'sleep_latency', 'latency', 'sleepOnsetLatency']))

    return {
      user_id:              userId,
      provider:             'polar',
      provider_id:          `sleep_${date}`,
      measured_at:          start ?? `${date}T00:00:00Z`,
      date,
      data_type:            'sleep',
      sleep_duration_min:   durationMin,
      sleep_score:          scoreNum != null ? Math.round(scoreNum) : null,
      deep_duration_min:    deep,
      light_duration_min:   light,
      rem_duration_min:     rem,
      awake_duration_min:   awake,
      sleep_efficiency_pct: efficiency,
      sleep_latency_min:    latency,
      sleep_start:          start,
      sleep_end:            end,
      raw_data:             raw,
    }
  })

  const firstNonNull = rows.find(r => r.sleep_duration_min != null || r.sleep_score != null)
  console.log('[SLEEP] mapped sample:', JSON.stringify(
    firstNonNull
      ? { date: firstNonNull.date, dur: firstNonNull.sleep_duration_min, score: firstNonNull.sleep_score,
          deep: firstNonNull.deep_duration_min, light: firstNonNull.light_duration_min, rem: firstNonNull.rem_duration_min }
      : { warning: 'aucune métrique mappée — vérifier [SLEEP RAW BODY]' },
  ))

  const { data, error } = await supabase
    .from('health_data')
    .upsert(rows, { onConflict: 'user_id,provider,date,data_type' })
    .select('id, date')

  console.log('[SLEEP] result:', error ? error.message : 'OK', 'rows:', data?.length ?? 0)
  if (error) console.error('[SLEEP] UPSERT ERROR detail:', error.message, error.details ?? '')

  return { status: 'ok', nights_synced: error ? 0 : rows.length }
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
      hrv_rmssd:   hrvVal,   // colonne dédiée (en plus de raw_data.hrv_rmssd)
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

  const { data: upserted, error } = await supabase
    .from('activities')
    .upsert(rows, { onConflict: 'user_id,provider,provider_id' })
    .select('id, sport_type')
  if (error) throw new Error(`activities upsert: ${error.message}`)

  // Records : déclenche pour chaque activité bike (séquentiel pour ne pas saturer)
  for (const a of upserted ?? []) {
    await triggerRecordsProcessing({
      activityId: a.id as string,
      userId,
      sport:      (a.sport_type as string | null) ?? null,
    })
  }

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
