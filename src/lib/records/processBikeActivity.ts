// ══════════════════════════════════════════════════════════════
// processBikeActivityRecords — partagé entre /process-records et
// /backfill-records. Calcule la session MMP, compare aux records
// existants (null-safe), insère les records battus, met à jour
// activities.records_processed + records_beaten (idempotent).
// ══════════════════════════════════════════════════════════════

import type { SupabaseClient } from '@supabase/supabase-js'

// d = durée en secondes ; label = distance_label DB ; display = label UI
export const BIKE_RECORD_DURS: { d: number; label: string; display: string }[] = [
  { d: 1,     label: 'Pmax',  display: 'Pmax' },
  { d: 5,     label: '5s',    display: "5''" },
  { d: 10,    label: '10s',   display: "10''" },
  { d: 30,    label: '30s',   display: "30''" },
  { d: 60,    label: '1min',  display: "1'" },
  { d: 180,   label: '3min',  display: "3'" },
  { d: 300,   label: '5min',  display: "5'" },
  { d: 480,   label: '8min',  display: "8'" },
  { d: 600,   label: '10min', display: "10'" },
  { d: 720,   label: '12min', display: "12'" },
  { d: 900,   label: '15min', display: "15'" },
  { d: 1200,  label: '20min', display: "20'" },
  { d: 1800,  label: '30min', display: "30'" },
  { d: 2700,  label: '45min', display: "45'" },
  { d: 3600,  label: '1h',    display: '1h' },
  { d: 5400,  label: '90min', display: '1h30' },
  { d: 7200,  label: '2h',    display: '2h' },
  { d: 10800, label: '3h',    display: '3h' },
  { d: 14400, label: '4h',    display: '4h' },
  { d: 18000, label: '5h',    display: '5h' },
  { d: 21600, label: '6h',    display: '6h' },
]

export interface BeatenEntryAllTime { label: string; display: string; watts: number }
export interface BeatenEntryYear    { label: string; display: string; watts: number; year: string }
export interface BeatenPayload {
  allTime: BeatenEntryAllTime[]
  year:    BeatenEntryYear[]
}

interface StreamsShape { watts?: number[] | null }
interface ActivityRow {
  user_id:            string
  sport_type:         string | null
  started_at:         string | null
  streams:            StreamsShape | null
  raw_data:           { streams?: StreamsShape | null } | null
  records_processed:  boolean | null
  records_beaten:     BeatenPayload | null
}

interface PersonalRecordRow { distance_label: string; performance: string; achieved_at: string }

// ── MMP sliding window (cap 1500W) ───────────────────────────
export function computeMmp(wStream: number[], dur: number): number {
  const N = wStream.length
  if (dur > N) return 0
  const cleaned = wStream.map(w => Math.min(Math.max(0, Number(w) || 0), 1500))
  const prefix = new Array(N + 1).fill(0)
  for (let i = 0; i < N; i++) prefix[i + 1] = prefix[i] + cleaned[i]
  let max = 0
  for (let i = 0; i <= N - dur; i++) {
    const avg = (prefix[i + dur] - prefix[i]) / dur
    if (avg > max) max = avg
  }
  return Math.round(max)
}

function isBikeSport(s: string | null | undefined): boolean {
  const sport = (s ?? '').toLowerCase()
  return sport === 'bike' || sport === 'cycling' || sport === 'cycle' || sport === 'velo'
}

interface ProcessOptions { force?: boolean }
interface ProcessResult { payload: BeatenPayload; processed: boolean; reason?: string }

export async function processBikeActivityRecords(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sb:         SupabaseClient<any, 'public', any>,
  userId:     string,
  activityId: string,
  opts:       ProcessOptions = {},
): Promise<ProcessResult> {

  const { data: actRaw } = await sb
    .from('activities')
    .select('user_id, sport_type, started_at, streams, raw_data, records_processed, records_beaten')
    .eq('id', activityId)
    .eq('user_id', userId)
    .single()

  const activity = actRaw as ActivityRow | null
  if (!activity) {
    return { payload: { allTime: [], year: [] }, processed: false, reason: 'not_found' }
  }

  if (!isBikeSport(activity.sport_type)) {
    return { payload: { allTime: [], year: [] }, processed: false, reason: 'not_bike' }
  }

  // Idempotence : si déjà traité, retourner le résultat caché
  if (!opts.force && activity.records_processed && activity.records_beaten) {
    return { payload: activity.records_beaten, processed: false, reason: 'cached' }
  }

  const watts = activity.streams?.watts ?? activity.raw_data?.streams?.watts ?? null
  if (!watts || !Array.isArray(watts) || watts.length < 5) {
    const empty: BeatenPayload = { allTime: [], year: [] }
    await sb.from('activities')
      .update({ records_processed: true, records_beaten: empty })
      .eq('id', activityId)
    return { payload: empty, processed: true, reason: 'no_watts' }
  }

  const startedAt    = activity.started_at ?? new Date().toISOString()
  const activityDate = startedAt.slice(0, 10)
  const activityYear = startedAt.slice(0, 4)
  const currentYear  = String(new Date().getFullYear())

  // Records existants pour le user (bike)
  const labels = BIKE_RECORD_DURS.map(d => d.label)
  const { data: prRows } = await sb
    .from('personal_records')
    .select('distance_label, performance, achieved_at')
    .eq('user_id', userId)
    .eq('sport', 'bike')
    .in('distance_label', labels)

  const existing = (prRows ?? []) as PersonalRecordRow[]

  // Pour le backfill chronologique : on ne compte comme « antérieur »
  // qu'un record avec achieved_at STRICTEMENT antérieur à l'activité courante.
  // Ça garantit que la 1ère activité d'une journée bat le « rien » de cette
  // journée et que les comparaisons sont causalement correctes.
  const priorOnly = existing.filter(r => r.achieved_at < activityDate)

  // null-safe : aucun record antérieur → bestAll/bestYear = 0
  const bestAll:  Record<string, number> = {}
  const bestYear: Record<string, number> = {}
  for (const r of priorOnly) {
    const w = parseInt(r.performance) || 0
    if (w <= 0) continue
    if (w > (bestAll[r.distance_label] ?? 0)) bestAll[r.distance_label] = w
    if (r.achieved_at.slice(0, 4) === activityYear && w > (bestYear[r.distance_label] ?? 0)) {
      bestYear[r.distance_label] = w
    }
  }

  const allTimeBeaten: BeatenEntryAllTime[] = []
  const yearBeaten:    BeatenEntryYear[]    = []
  const toInsert:      { distance_label: string; watts: number }[] = []

  for (const { d, label, display } of BIKE_RECORD_DURS) {
    if (d > watts.length) continue
    const sessionW = computeMmp(watts, d)
    if (sessionW <= 0) continue

    const prevAll  = bestAll[label]  ?? 0
    const prevYear = bestYear[label] ?? 0

    // Si prevAll = 0 (null-safe) → 1ère perf compte
    const beatsAll  = sessionW > prevAll
    // Année = uniquement si activité dans l'année courante (côté UI usage),
    // mais pour la cohérence on accepte aussi les records d'années passées
    // → on affiche le badge avec l'année de l'activité, pas l'année courante
    const beatsYear = sessionW > prevYear && !beatsAll

    if (beatsAll) {
      allTimeBeaten.push({ label, display, watts: sessionW })
      toInsert.push({ distance_label: label, watts: sessionW })
    } else if (beatsYear) {
      yearBeaten.push({ label, display, watts: sessionW, year: activityYear })
      toInsert.push({ distance_label: label, watts: sessionW })
    }
  }
  // (currentYear referenced for documentation/future use)
  void currentYear

  if (toInsert.length > 0) {
    const rows = toInsert.map(t => ({
      user_id:          userId,
      sport:            'bike',
      distance_label:   t.distance_label,
      performance:      String(t.watts),
      performance_unit: 'watts',
      event_type:       'auto_session',
      achieved_at:      activityDate,
      race_name:        null,
      pace_s_km:        null,
      elevation_gain_m: null,
      split_swim:       null,
      split_bike:       null,
      split_run:        null,
      station_times:    null,
      notes:            `Auto-détecté depuis l'activité du ${activityDate}`,
    }))
    const { error: insErr } = await sb.from('personal_records').insert(rows)
    if (insErr) {
      return {
        payload:   { allTime: [], year: [] },
        processed: false,
        reason:    `insert_failed: ${insErr.message}`,
      }
    }
  }

  const payload: BeatenPayload = { allTime: allTimeBeaten, year: yearBeaten }
  await sb.from('activities')
    .update({ records_processed: true, records_beaten: payload })
    .eq('id', activityId)

  return { payload, processed: true }
}
