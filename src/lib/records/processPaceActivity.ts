// ══════════════════════════════════════════════════════════════
// processPaceActivityRecords — équivalent de processBikeActivity pour les
// sports « au temps » (course, natation, aviron). Calcule le meilleur temps
// pour couvrir chaque distance repère depuis les streams (distance + time),
// compare aux records existants (plus rapide = meilleur), insère les records
// battus dans personal_records (event_type 'auto_session', activity_id lié),
// puis marque l'activité records_processed. Idempotent, null-safe.
// ══════════════════════════════════════════════════════════════
import type { SupabaseClient } from '@supabase/supabase-js'
import { notifyUser } from '@/lib/notifications/dispatch'

// Repères par sport → mêmes distance_label que l'UI (DatasTab RUN_KM/SWIM_M/ROW_M).
const RUN_TARGETS:  { m: number; label: string }[] = [
  { m: 400, label: '400m' }, { m: 1000, label: '1km' }, { m: 5000, label: '5km' },
  { m: 10000, label: '10km' }, { m: 21097.5, label: 'Semi' }, { m: 42195, label: 'Marathon' },
  { m: 50000, label: '50km' }, { m: 100000, label: '100km' },
]
const SWIM_TARGETS: { m: number; label: string }[] = [
  { m: 100, label: '100m' }, { m: 200, label: '200m' }, { m: 400, label: '400m' },
  { m: 1000, label: '1000m' }, { m: 1500, label: '1500m' }, { m: 2000, label: '2000m' },
  { m: 5000, label: '5000m' }, { m: 10000, label: '10000m' },
]
const ROW_TARGETS:  { m: number; label: string }[] = [
  { m: 500, label: '500m' }, { m: 1000, label: '1000m' }, { m: 2000, label: '2000m' },
  { m: 5000, label: '5000m' }, { m: 10000, label: '10000m' },
]

export type PaceSport = 'run' | 'swim' | 'rowing'

export function paceSportOf(sportType: string | null | undefined): PaceSport | null {
  const s = (sportType ?? '').toLowerCase()
  if (s === 'run' || s === 'trail_run' || s === 'course' || s === 'trail') return 'run'
  if (s === 'swim' || s === 'natation') return 'swim'
  if (s === 'rowing' || s === 'row' || s === 'aviron') return 'rowing'
  return null
}
function targetsFor(sp: PaceSport) { return sp === 'run' ? RUN_TARGETS : sp === 'swim' ? SWIM_TARGETS : ROW_TARGETS }

function fmtTime(sec: number): string {
  const s = Math.round(sec)
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), ss = s % 60
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${String(ss).padStart(2, '0')}` : `${m}:${String(ss).padStart(2, '0')}`
}
function toSec(t: string): number {
  if (!t) return 0
  const p = t.split(':').map(Number)
  if (p.some(isNaN)) return 0
  return p.length === 3 ? p[0] * 3600 + p[1] * 60 + p[2] : p.length === 2 ? p[0] * 60 + p[1] : 0
}

// Meilleur temps (s) pour couvrir `target` mètres (deux pointeurs, distance croissante).
function bestTimeForDistance(dist: number[], time: number[], target: number): number {
  const n = Math.min(dist.length, time.length)
  if (n < 2) return 0
  let best = Infinity, i = 0
  for (let j = 0; j < n; j++) {
    while (i < j && dist[j] - dist[i + 1] >= target) i++
    if (dist[j] - dist[i] >= target) {
      const dt = time[j] - time[i]
      if (dt > 0 && dt < best) best = dt
    }
  }
  return best === Infinity ? 0 : Math.round(best)
}

interface StreamsShape { distance?: number[] | null; time?: number[] | null }
interface ActivityRow {
  user_id: string; sport_type: string | null; started_at: string | null
  streams: StreamsShape | null; raw_data: { streams?: StreamsShape | null } | null
  records_processed: boolean | null; records_beaten: any
}
interface PersonalRecordRow { distance_label: string; performance: string; achieved_at: string }

interface BeatenEntry { label: string; time: string }
export interface PaceBeatenPayload { allTime: BeatenEntry[]; year: BeatenEntry[] }
interface ProcessResult { payload: PaceBeatenPayload; processed: boolean; reason?: string }

export async function processPaceActivityRecords(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sb: SupabaseClient<any, 'public', any>,
  userId: string,
  activityId: string,
  opts: { force?: boolean } = {},
): Promise<ProcessResult> {
  const empty: PaceBeatenPayload = { allTime: [], year: [] }
  const { data: actRaw } = await sb
    .from('activities')
    .select('user_id, sport_type, started_at, streams, raw_data, records_processed, records_beaten')
    .eq('id', activityId).eq('user_id', userId).single()

  const activity = actRaw as ActivityRow | null
  if (!activity) return { payload: empty, processed: false, reason: 'not_found' }

  const sp = paceSportOf(activity.sport_type)
  if (!sp) return { payload: empty, processed: false, reason: 'not_pace_sport' }

  if (!opts.force && activity.records_processed && activity.records_beaten) {
    return { payload: activity.records_beaten as PaceBeatenPayload, processed: false, reason: 'cached' }
  }

  const streams = activity.streams ?? activity.raw_data?.streams ?? null
  const distRaw = streams?.distance
  if (!distRaw || !Array.isArray(distRaw) || distRaw.length < 3) {
    await sb.from('activities').update({ records_processed: true, records_beaten: empty }).eq('id', activityId)
    return { payload: empty, processed: true, reason: 'no_distance' }
  }
  const dist = distRaw.map(x => Number(x) || 0)
  // time stream, sinon on suppose 1 Hz (index = secondes).
  const timeRaw = streams?.time
  const time = (timeRaw && Array.isArray(timeRaw) && timeRaw.length === dist.length)
    ? timeRaw.map(x => Number(x) || 0)
    : dist.map((_, i) => i)

  const startedAt = activity.started_at ?? new Date().toISOString()
  const activityDate = startedAt.slice(0, 10)
  const activityYear = startedAt.slice(0, 4)

  const targets = targetsFor(sp)
  const { data: prRows } = await sb
    .from('personal_records')
    .select('distance_label, performance, achieved_at')
    .eq('user_id', userId).eq('sport', sp)
    .in('distance_label', targets.map(t => t.label))
  const priorOnly = (prRows ?? []).filter((r: PersonalRecordRow) => r.achieved_at < activityDate) as PersonalRecordRow[]

  // Meilleur temps ANTÉRIEUR par distance (plus petit = meilleur).
  const bestAll: Record<string, number> = {}
  const bestYear: Record<string, number> = {}
  for (const r of priorOnly) {
    const sec = toSec(r.performance)
    if (sec <= 0) continue
    if (bestAll[r.distance_label] == null || sec < bestAll[r.distance_label]) bestAll[r.distance_label] = sec
    if (r.achieved_at.slice(0, 4) === activityYear && (bestYear[r.distance_label] == null || sec < bestYear[r.distance_label])) bestYear[r.distance_label] = sec
  }

  const allTimeBeaten: BeatenEntry[] = []
  const yearBeaten: BeatenEntry[] = []
  const toInsert: { label: string; time: string }[] = []

  const totalDist = dist[dist.length - 1] - dist[0]
  for (const { m, label } of targets) {
    if (m > totalDist) continue
    const sessionSec = bestTimeForDistance(dist, time, m)
    if (sessionSec <= 0) continue
    const prevAll = bestAll[label] ?? Infinity
    const prevYear = bestYear[label] ?? Infinity
    const beatsAll = sessionSec < prevAll
    const beatsYear = sessionSec < prevYear && !beatsAll
    const timeStr = fmtTime(sessionSec)
    if (beatsAll) { allTimeBeaten.push({ label, time: timeStr }); toInsert.push({ label, time: timeStr }) }
    else if (beatsYear) { yearBeaten.push({ label, time: timeStr }); toInsert.push({ label, time: timeStr }) }
  }

  if (toInsert.length > 0) {
    const rows = toInsert.map(t => ({
      user_id: userId, sport: sp, distance_label: t.label,
      performance: t.time, performance_unit: 'time', event_type: 'auto_session',
      achieved_at: activityDate, activity_id: activityId,
      race_name: null, pace_s_km: null, elevation_gain_m: null,
      split_swim: null, split_bike: null, split_run: null, station_times: null,
      notes: `Auto-détecté depuis l'activité du ${activityDate}`,
    }))
    const { error: insErr } = await sb.from('personal_records').insert(rows)
    if (insErr) {
      console.error('[records-pace] insert failed for activity', activityId, '—', insErr.message)
      return { payload: empty, processed: false, reason: `insert_failed: ${insErr.message}` }
    }
    if (allTimeBeaten.length > 0) {
      const best = allTimeBeaten[0]
      const extra = allTimeBeaten.length > 1 ? ` (+${allTimeBeaten.length - 1})` : ''
      void notifyUser(userId, 'performance.progression', {
        title: 'Nouveau record 💥',
        body: `${best.label} en ${best.time} — nouveau record${extra} !`,
        url: '/performance', dedupKey: `pr-${activityId}`, once: true,
      })
    }
  }

  const payload: PaceBeatenPayload = { allTime: allTimeBeaten, year: yearBeaten }
  await sb.from('activities').update({ records_processed: true, records_beaten: payload }).eq('id', activityId)
  return { payload, processed: true }
}
