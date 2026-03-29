import { createServiceClient } from '@/lib/supabase/server'
import { getValidToken } from '@/lib/oauth/tokens'

const STRAVA_API = 'https://www.strava.com/api/v3'

export async function syncStravaActivities(userId: string): Promise<number> {
  const token = await getValidToken(userId, 'strava')
  if (!token) throw new Error('No valid Strava token')

  const supabase = createServiceClient()

  // Dernière activité stockée pour sync incrémentale
  const { data: latest } = await supabase
    .from('activities')
    .select('started_at')
    .eq('user_id', userId)
    .eq('provider', 'strava')
    .order('started_at', { ascending: false })
    .limit(1)
    .single()

  const after = latest?.started_at
    ? Math.floor(new Date(latest.started_at).getTime() / 1000) + 1
    : undefined

  // Récupère toutes les pages
  let all: any[] = []
  let page = 1
  while (true) {
    const params = new URLSearchParams({
      page:     String(page),
      per_page: '100',
      ...(after ? { after: String(after) } : {}),
    })
    const res = await fetch(`${STRAVA_API}/athlete/activities?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) throw new Error(`Strava API error: ${res.status}`)
    const batch = await res.json()
    if (!batch.length) break
    all = [...all, ...batch]
    if (batch.length < 100) break
    page++
  }

  if (!all.length) return 0

  // Mappe vers notre schéma
  const rows = all.map((a: any) => ({
    user_id:               userId,
    provider:              'strava',
    provider_id:           String(a.id),
    external_url:          `https://www.strava.com/activities/${a.id}`,
    sport_type:            mapStravaSportType(a.sport_type),
    title:                 a.name,
    started_at:            a.start_date,
    elapsed_time_s:        a.elapsed_time,
    moving_time_s:         a.moving_time,
    distance_m:            a.distance,
    elevation_gain_m:      a.total_elevation_gain,
    avg_speed_ms:          a.average_speed,
    max_speed_ms:          a.max_speed,
    avg_pace_s_km:         a.average_speed > 0 ? Math.round(1000 / a.average_speed) : null,
    avg_watts:             a.average_watts        ?? null,
    max_watts:             a.max_watts            ?? null,
    normalized_watts:      a.weighted_average_watts ?? null,
    kilojoules:            a.kilojoules           ?? null,
    avg_hr:                a.average_heartrate    ?? null,
    max_hr:                a.max_heartrate        ?? null,
    avg_cadence:           a.average_cadence      ?? null,
    calories:              a.calories             ?? null,
    suffer_score:          a.suffer_score         ?? null,
    trainer:               a.trainer              ?? false,
    commute:               a.commute              ?? false,
    avg_temp_c:            a.average_temp         ?? null,
    is_race:               a.workout_type === 1,
    raw_data:              a,
  }))

  const { error } = await supabase
    .from('activities')
    .upsert(rows, { onConflict: 'user_id,provider,provider_id' })

  if (error) throw new Error(`Supabase upsert error: ${error.message}`)
  return all.length
}

function mapStravaSportType(type: string): string {
  const map: Record<string, string> = {
    Run:             'run',
    TrailRun:        'trail_run',
    Ride:            'bike',
    VirtualRide:     'virtual_bike',
    Swim:            'swim',
    Rowing:          'rowing',
    WeightTraining:  'gym',
    Workout:         'other',
  }
  return map[type] ?? 'other'
}
