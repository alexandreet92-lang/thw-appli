import { createServiceClient } from '@/lib/supabase/server'
import { getValidToken } from '@/lib/oauth/tokens'

const STRAVA_API = 'https://www.strava.com/api/v3'

// Streams disponibles selon le sport
const STREAM_KEYS = 'time,distance,altitude,heartrate,velocity_smooth,watts,cadence'

interface StravaStream {
  type:         string
  data:         number[]
  series_type:  string
  original_size:number
  resolution:   string
}

async function fetchStreams(
  stravaId: number,
  token: string
): Promise<Record<string, number[]>> {
  try {
    const res = await fetch(
      `${STRAVA_API}/activities/${stravaId}/streams?keys=${STREAM_KEYS}&key_by_type=true`,
      { headers: { Authorization: `Bearer ${token}` } }
    )
    if (!res.ok) return {}
    const data = await res.json() as Record<string, StravaStream>
    // Transforme { heartrate: { data: [...] } } → { heartrate: [...] }
    const streams: Record<string, number[]> = {}
    if (data.heartrate)        streams.heartrate = data.heartrate.data
    if (data.velocity_smooth)  streams.velocity  = data.velocity_smooth.data
    if (data.altitude)         streams.altitude  = data.altitude.data
    if (data.cadence)          streams.cadence   = data.cadence.data
    if (data.watts)            streams.watts     = data.watts.data
    if (data.distance)         streams.distance  = data.distance.data
    if (data.time)             streams.time      = data.time.data
    return streams
  } catch {
    return {}
  }
}

export async function syncStravaActivities(userId: string): Promise<number> {
  const token = await getValidToken(userId, 'strava')
  if (!token) throw new Error('No valid Strava token')

  const supabase = createServiceClient()

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

  let all: any[] = []
  let page = 1
  while (true) {
    const params = new URLSearchParams({
      page: String(page), per_page: '100',
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

  // Pour chaque activité, récupère les streams
  // On limite à 10 activités par sync pour éviter le rate limit Strava (600 req/15min)
  const withStreams = await Promise.all(
    all.slice(0, 10).map(async (a: any) => {
      const streams = await fetchStreams(a.id, token)
      return { activity: a, streams }
    })
  )
  // Les activités sans streams gardent un objet vide
  const activitiesWithStreams = [
    ...withStreams,
    ...all.slice(10).map((a: any) => ({ activity: a, streams: {} })),
  ]

  const rows = activitiesWithStreams.map(({ activity: a, streams }) => ({
    user_id:          userId,
    provider:         'strava',
    provider_id:      String(a.id),
    external_url:     `https://www.strava.com/activities/${a.id}`,
    sport_type:       mapStravaSportType(a.sport_type),
    title:            a.name,
    started_at:       a.start_date,
    elapsed_time_s:   a.elapsed_time,
    moving_time_s:    a.moving_time,
    distance_m:       a.distance,
    elevation_gain_m: a.total_elevation_gain,
    avg_speed_ms:     a.average_speed,
    max_speed_ms:     a.max_speed,
    avg_pace_s_km:    a.average_speed > 0 ? Math.round(1000 / a.average_speed) : null,
    avg_watts:        a.average_watts        ?? null,
    max_watts:        a.max_watts            ?? null,
    normalized_watts: a.weighted_average_watts ?? null,
    kilojoules:       a.kilojoules           ?? null,
    avg_hr:           a.average_heartrate    ?? null,
    max_hr:           a.max_heartrate        ?? null,
    avg_cadence:      a.average_cadence      ?? null,
    calories:         a.calories             ?? null,
    suffer_score:     a.suffer_score         ?? null,
    trainer:          a.trainer              ?? false,
    commute:          a.commute              ?? false,
    avg_temp_c:       a.average_temp         ?? null,
    is_race:          a.workout_type === 1,
    raw_data:         a,
    // ← Streams stockés ici dans la colonne dédiée
    streams:          Object.keys(streams).length > 0 ? streams : null,
  }))

  const { error } = await supabase
    .from('activities')
    .upsert(rows, { onConflict: 'user_id,provider,provider_id' })

  if (error) throw new Error(`Supabase upsert error: ${error.message}`)
  return all.length
}

// Resync les streams pour les activités déjà importées (sans streams)
export async function syncMissingStreams(userId: string, limit = 20): Promise<number> {
  const token = await getValidToken(userId, 'strava')
  if (!token) throw new Error('No valid Strava token')

  const supabase = createServiceClient()

  // Récupère les activités Strava sans streams
  const { data: activitiesWithoutStreams } = await supabase
    .from('activities')
    .select('id, provider_id')
    .eq('user_id', userId)
    .eq('provider', 'strava')
    .is('streams', null)
    .order('started_at', { ascending: false })
    .limit(limit)

  if (!activitiesWithoutStreams?.length) return 0

  let synced = 0
  for (const activity of activitiesWithoutStreams) {
    const streams = await fetchStreams(Number(activity.provider_id), token)
    if (Object.keys(streams).length > 0) {
      await supabase
        .from('activities')
        .update({ streams, updated_at: new Date().toISOString() })
        .eq('id', activity.id)
      synced++
    }
    // Petite pause pour respecter le rate limit
    await new Promise(r => setTimeout(r, 200))
  }

  return synced
}

function mapStravaSportType(type: string): string {
  // Doit rester synchronisé avec la contrainte activities_sport_type_check
  const map: Record<string, string> = {
    // Running
    Run: 'run', VirtualRun: 'run',
    // Trail / rando
    TrailRun: 'trail_run', Hike: 'trail_run',
    // Vélo
    Ride: 'bike', MountainBikeRide: 'bike', GravelRide: 'bike',
    EBikeRide: 'bike', EMountainBikeRide: 'bike', Handcycle: 'bike', Velomobile: 'bike',
    // Vélo virtuel
    VirtualRide: 'virtual_bike',
    // Natation
    Swim: 'swim', OpenWaterSwim: 'open_water_swim',
    // Aviron / pagaie
    Rowing: 'rowing', VirtualRow: 'rowing', Canoeing: 'rowing', Kayaking: 'rowing',
    // Salle
    Workout: 'gym', WeightTraining: 'gym', Elliptical: 'gym', StairStepper: 'gym', Pilates: 'gym',
    // Valeurs spécifiques disponibles en DB
    CrossFit: 'crossfit',
    Yoga: 'yoga',
    HighIntensityIntervalTraining: 'hiit',
    // Ski & sports de glisse
    AlpineSki: 'ski', BackcountrySki: 'ski', NordicSki: 'ski',
    Snowboard: 'ski', Snowshoe: 'ski', RollerSki: 'ski',
    IceSkate: 'ski', InlineSkate: 'ski',
  }
  return map[type] ?? 'other'
}
