import { createServiceClient } from '@/lib/supabase/server'
import { getValidToken } from './tokens'

// ── Mapping des types d'activité Strava → notre schéma ────────────────
// Doit rester synchronisé avec la contrainte activities_sport_type_check
const SPORT_TYPE_MAP: Record<string, string> = {
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

function mapSportType(stravaType: string): string {
  return SPORT_TYPE_MAP[stravaType] ?? 'other'
}

// ── Fetch depuis l'API Strava ──────────────────────────────────────────
export async function fetchStravaActivities(
  userId: string,
  opts: { page?: number; perPage?: number; after?: number } = {}
) {
  const token = await getValidToken(userId)
  if (!token) throw new Error('No valid Strava token')

  const params = new URLSearchParams({
    page:     String(opts.page ?? 1),
    per_page: String(opts.perPage ?? 30),
    ...(opts.after ? { after: String(opts.after) } : {}),
  })

  const res = await fetch(
    `${process.env.STRAVA_API_BASE ?? 'https://www.strava.com/api/v3'}/athlete/activities?${params}`,
    { headers: { Authorization: `Bearer ${token.access_token}` } }
  )
  if (!res.ok) throw new Error(`Strava API error: ${res.status}`)
  return res.json()
}

// ── Sync Strava → table activities (schéma unifié) ────────────────────
export async function syncStravaActivities(userId: string): Promise<number> {
  const supabase = createServiceClient()

  // Récupère la date de la dernière activité importée depuis Strava
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

  // Pagination — récupère toutes les nouvelles activités
  let all: any[] = []
  let page = 1
  while (true) {
    const batch = await fetchStravaActivities(userId, { page, perPage: 100, after })
    if (!batch.length) break
    all = [...all, ...batch]
    if (batch.length < 100) break
    page++
  }
  if (!all.length) return 0

  // Mapping Strava fields → colonnes réelles de la table activities
  const rows = all.map((a: any) => ({
    user_id:           userId,
    provider:          'strava',
    provider_id:       String(a.id),
    title:             a.name,
    sport_type:        mapSportType(a.sport_type ?? a.type),
    started_at:        a.start_date,
    distance_m:        a.distance               ?? null,
    moving_time_s:     a.moving_time            ?? null,
    elapsed_time_s:    a.elapsed_time           ?? null,
    elevation_gain_m:  a.total_elevation_gain   ?? null,
    average_speed:     a.average_speed          ?? null,
    avg_watts:         a.average_watts          ?? null,
    kilojoules:        a.kilojoules             ?? null,
    average_heartrate: a.average_heartrate      ?? null,
    max_heartrate:     a.max_heartrate          ?? null,
    avg_cadence:       a.average_cadence        ?? null,
    tss:               a.suffer_score           ?? null,
    calories:          a.calories               ?? null,
    trainer:           a.trainer                ?? false,
    commute:           a.commute                ?? false,
    is_race:           a.workout_type === 1,
    streams:           null, // fetched on-demand
  }))

  const { error } = await supabase
    .from('activities')
    .upsert(rows, { onConflict: 'user_id,provider,provider_id' })

  if (error) throw new Error(error.message)
  return all.length
}

// ── Lecture des activités stockées ────────────────────────────────────
export async function getStoredActivities(
  userId: string,
  opts: { limit?: number; offset?: number; sportType?: string } = {}
) {
  const supabase = createServiceClient()
  let q = supabase
    .from('activities')
    .select('*')
    .eq('user_id', userId)
    .order('started_at', { ascending: false })
    .range(
      opts.offset ?? 0,
      (opts.offset ?? 0) + (opts.limit ?? 20) - 1
    )

  if (opts.sportType && opts.sportType !== 'all') {
    q = q.eq('sport_type', opts.sportType)
  }

  const { data, error } = await q
  if (error) throw new Error(error.message)
  return data ?? []
}
