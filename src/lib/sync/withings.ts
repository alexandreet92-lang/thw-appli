import { createServiceClient } from '@/lib/supabase/server'
import { getValidToken } from '@/lib/oauth/tokens'

const WITHINGS_API = 'https://wbsapi.withings.net'

// Withings utilise des timestamps Unix pour les dates
function toUnix(date: Date): number {
  return Math.floor(date.getTime() / 1000)
}

function daysAgo(n: number): Date {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000)
}

async function withingsGet(token: string, path: string, params: Record<string, string>) {
  const url = new URLSearchParams({ ...params })
  const res = await fetch(`${WITHINGS_API}${path}?${url}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error(`Withings API error: ${res.status}`)
  const json = await res.json()
  if (json.status !== 0) throw new Error(`Withings error: ${json.error ?? json.status}`)
  return json.body
}

// Sync body metrics (poids, graisse, masse musculaire...)
export async function syncWithingsBodyMetrics(userId: string): Promise<number> {
  const token = await getValidToken(userId, 'withings')
  if (!token) throw new Error('No valid Withings token')

  const supabase = createServiceClient()

  const body = await withingsGet(token, '/measure', {
    action:    'getmeas',
    meastypes: '1,5,6,8,76,77,88', // poids, graisse, masse musculaire, eau, IMC...
    category:  '1',
    startdate: String(toUnix(daysAgo(30))),
    enddate:   String(toUnix(new Date())),
  })

  const groups: any[] = body.measuregrps ?? []
  if (!groups.length) return 0

  const rows = groups.map((g: any) => {
    const measures: Record<number, number> = {}
    for (const m of g.measures) {
      measures[m.type] = m.value * Math.pow(10, m.unit)
    }

    const date = new Date(g.date * 1000)

    return {
      user_id:        userId,
      provider:       'withings',
      provider_id:    `body_${g.grpid}`,
      measured_at:    date.toISOString(),
      date:           date.toISOString().split('T')[0],
      data_type:      'body_metrics',
      weight_kg:      measures[1]  ?? null,
      body_fat_pct:   measures[6]  ?? null,
      muscle_mass_kg: measures[76] ?? null,
      bone_mass_kg:   measures[88] ?? null,
      water_pct:      measures[77] ?? null,
      bmi:            measures[8]  ?? null,
      raw_data:       g,
    }
  })

  const { error } = await supabase
    .from('health_data')
    .upsert(rows, { onConflict: 'user_id,provider,date,data_type' })

  if (error) throw new Error(error.message)
  return rows.length
}

// Sync sommeil Withings
export async function syncWithingsSleep(userId: string): Promise<number> {
  const token = await getValidToken(userId, 'withings')
  if (!token) throw new Error('No valid Withings token')

  const supabase = createServiceClient()

  const body = await withingsGet(token, '/v2/sleep', {
    action:     'getsummary',
    startdateymd: daysAgo(30).toISOString().split('T')[0],
    enddateymd:   new Date().toISOString().split('T')[0],
    data_fields: 'nb_rem_episodes,sleep_score,snoring,snoring_count,apnea_hypopnea_index,breathing_disturbances_intensity,deepsleepduration,durationtosleep,durationtowakeup,hr_average,hr_max,hr_min,lightsleepduration,nb_rem_episodes,out_of_bed_count,remsleepduration,rr_average,rr_max,rr_min,sleep_score,sleepiness,sleep_score,total_sleep_time,total_timeinbed,wakeupcount,wakeupduration',
  })

  const series: any[] = body.series ?? []
  if (!series.length) return 0

  const rows = series.map((s: any) => {
    const startDate = new Date(s.startdate * 1000)
    const totalSleepMin = s.data?.total_sleep_time ? Math.round(s.data.total_sleep_time / 60) : null
    const remMin   = s.data?.remsleepduration   ? Math.round(s.data.remsleepduration / 60)   : null
    const deepMin  = s.data?.deepsleepduration  ? Math.round(s.data.deepsleepduration / 60)  : null
    const lightMin = s.data?.lightsleepduration ? Math.round(s.data.lightsleepduration / 60) : null

    return {
      user_id:            userId,
      provider:           'withings',
      provider_id:        `sleep_${s.date}`,
      measured_at:        startDate.toISOString(),
      date:               s.date,
      data_type:          'sleep',
      sleep_duration_min: totalSleepMin,
      sleep_score:        s.data?.sleep_score      ?? null,
      rem_duration_min:   remMin,
      deep_duration_min:  deepMin,
      light_duration_min: lightMin,
      sleep_start:        startDate.toISOString(),
      sleep_end:          new Date(s.enddate * 1000).toISOString(),
      hr_resting:         s.data?.hr_average        ?? null,
      raw_data:           s,
    }
  })

  const { error } = await supabase
    .from('health_data')
    .upsert(rows, { onConflict: 'user_id,provider,date,data_type' })

  if (error) throw new Error(error.message)
  return rows.length
}

// Sync activités Withings (montres connectées)
export async function syncWithingsActivities(userId: string): Promise<number> {
  const token = await getValidToken(userId, 'withings')
  if (!token) throw new Error('No valid Withings token')

  const supabase = createServiceClient()

  const body = await withingsGet(token, '/v2/measure', {
    action:       'getactivity',
    startdateymd: daysAgo(30).toISOString().split('T')[0],
    enddateymd:   new Date().toISOString().split('T')[0],
    data_fields:  'steps,distance,elevation,soft,moderate,intense,active,calories,totalcalories,hr_average,hr_min,hr_max,hr_zone_0,hr_zone_1,hr_zone_2,hr_zone_3',
  })

  const activities: any[] = body.activities ?? []
  if (!activities.length) return 0

  const rows = activities.map((a: any) => ({
    user_id:          userId,
    provider:         'withings',
    provider_id:      `activity_${a.date}`,
    sport_type:       'other',
    title:            `Withings Activity ${a.date}`,
    started_at:       `${a.date}T00:00:00Z`,
    distance_m:       a.distance    ?? null,
    elevation_gain_m: a.elevation   ?? null,
    avg_hr:           a.hr_average  ?? null,
    max_hr:           a.hr_max      ?? null,
    calories:         a.calories    ?? null,
    raw_data:         a,
  }))

  const { error } = await supabase
    .from('activities')
    .upsert(rows, { onConflict: 'user_id,provider,provider_id' })

  if (error) throw new Error(error.message)
  return rows.length
}
