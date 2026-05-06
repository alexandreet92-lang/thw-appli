// ══════════════════════════════════════════════════════════════════
// STRAVA SYNC — src/lib/sync/strava.ts
//
// Logique de synchronisation Strava → table activities.
//
// Deux modes :
//   • Premier sync (0 activités Strava en DB) → backfill complet, toutes les pages
//   • Syncs suivants → incrémental, seulement les nouvelles activités
//
// Rate-limit Strava : 200 req/15min, 2000/jour
//   → 100ms entre chaque page, 200ms entre chaque stream
//   → Retry automatique en cas de 429
// ══════════════════════════════════════════════════════════════════

import { createServiceClient } from '@/lib/supabase/server'
import { getValidToken }       from '@/lib/oauth/tokens'

const STRAVA_API  = 'https://www.strava.com/api/v3'
const STREAM_KEYS = 'time,distance,altitude,heartrate,velocity_smooth,watts,cadence'

// ── Types ─────────────────────────────────────────────────────────
interface StravaActivity {
  id:                      number
  name:                    string
  sport_type:              string
  type:                    string
  start_date:              string
  elapsed_time:            number
  moving_time:             number
  distance:                number
  total_elevation_gain:    number | null
  average_speed:           number | null
  average_watts:           number | null
  kilojoules:              number | null
  average_heartrate:       number | null
  max_heartrate:           number | null
  average_cadence:         number | null
  calories:                number | null
  suffer_score:            number | null
  trainer:                 boolean
  commute:                 boolean
  average_temp:            number | null
  workout_type:            number | null
}

interface StravaStream {
  data:          number[]
  series_type:   string
  original_size: number
  resolution:    string
}

// ── Helpers ───────────────────────────────────────────────────────

async function fetchPage(
  token: string,
  page: number,
  after?: number,
): Promise<StravaActivity[]> {
  const params = new URLSearchParams({
    per_page: '200',
    page:     String(page),
    ...(after != null ? { after: String(after) } : {}),
  })

  let attempts = 0
  while (attempts < 3) {
    const res = await fetch(`${STRAVA_API}/athlete/activities?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    })

    if (res.status === 429) {
      // Rate limit — attendre 60s et réessayer
      console.warn(`[strava-sync] 429 rate limit on page ${page} — waiting 60s`)
      await new Promise(r => setTimeout(r, 60_000))
      attempts++
      continue
    }

    if (!res.ok) throw new Error(`Strava API error: ${res.status}`)
    return res.json() as Promise<StravaActivity[]>
  }

  throw new Error('Strava rate limit: max retries exceeded')
}

async function fetchStreams(
  stravaId: number,
  token: string,
): Promise<Record<string, number[]>> {
  try {
    const res = await fetch(
      `${STRAVA_API}/activities/${stravaId}/streams?keys=${STREAM_KEYS}&key_by_type=true`,
      { headers: { Authorization: `Bearer ${token}` } },
    )
    if (!res.ok) return {}
    const data = await res.json() as Record<string, StravaStream>
    const streams: Record<string, number[]> = {}
    if (data.time)             streams.time             = data.time.data
    if (data.heartrate)        streams.heartrate        = data.heartrate.data
    if (data.velocity_smooth)  streams.velocity_smooth  = data.velocity_smooth.data
    if (data.altitude)         streams.altitude         = data.altitude.data
    if (data.cadence)          streams.cadence          = data.cadence.data
    if (data.watts)            streams.watts            = data.watts.data
    if (data.distance)         streams.distance         = data.distance.data
    return streams
  } catch {
    return {}
  }
}

/** Mappe une activité Strava vers les colonnes réelles de la table activities. */
function toRow(a: StravaActivity, userId: string) {
  return {
    user_id:           userId,
    provider:          'strava',
    provider_id:       String(a.id),
    external_url:      `https://www.strava.com/activities/${a.id}`,
    sport_type:        mapStravaSportType(a.sport_type ?? a.type),
    title:             a.name,
    started_at:        a.start_date,
    elapsed_time_s:    a.elapsed_time,
    moving_time_s:     a.moving_time,
    distance_m:        a.distance                   ?? null,
    elevation_gain_m:  a.total_elevation_gain        ?? null,
    average_speed:     a.average_speed               ?? null,
    avg_watts:         a.average_watts               ?? null,
    kilojoules:        a.kilojoules                  ?? null,
    average_heartrate: a.average_heartrate           ?? null,
    max_heartrate:     a.max_heartrate               ?? null,
    avg_cadence:       a.average_cadence             ?? null,
    calories:          a.calories                    ?? null,
    tss:               a.suffer_score                ?? null,
    trainer:           a.trainer                     ?? false,
    commute:           a.commute                     ?? false,
    avg_temp_c:        a.average_temp                ?? null,
    is_race:           a.workout_type === 1,
  }
}

// ── Sync principal ─────────────────────────────────────────────────

/**
 * Synchronise les activités Strava pour un utilisateur.
 *
 * Premier sync (0 activités Strava en DB) : backfill complet, toutes les pages.
 * Syncs suivants : incrémental depuis la dernière activité importée.
 *
 * Après l'import, les streams sont récupérés séquentiellement pour :
 *   - Les activités des 90 derniers jours sans streams
 *   - Les courses (is_race=true) sans streams
 *   Limite : 100 activités, 200ms de délai entre chaque appel.
 */
export async function syncStravaActivities(userId: string): Promise<number> {
  const token = await getValidToken(userId, 'strava')
  if (!token) throw new Error('No valid Strava token')

  const supabase = createServiceClient()

  // ── Détecter le mode : premier sync ou incrémental ─────────────
  const { data: latest } = await supabase
    .from('activities')
    .select('started_at')
    .eq('user_id', userId)
    .eq('provider', 'strava')
    .not('provider_id', 'is', null)
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const isFirstSync = !latest
  const after = latest
    ? Math.floor(new Date(latest.started_at).getTime() / 1000) + 1
    : undefined

  console.log(
    `[strava-sync] user=${userId} mode=${isFirstSync ? 'full-backfill' : 'incremental'}`,
    after ? `after=${after}` : '',
  )

  // ── Récupérer toutes les pages depuis Strava ───────────────────
  let all: StravaActivity[] = []
  let page = 1
  let hasMore = true

  while (hasMore) {
    const batch = await fetchPage(token, page, after)

    if (batch.length === 0) {
      hasMore = false
      break
    }

    all = [...all, ...batch]
    console.log(`[strava-sync] Page ${page}: ${batch.length} activités (total: ${all.length})`)

    if (batch.length < 200) hasMore = false
    page++

    // Petite pause pour respecter le rate limit Strava (200 req/15min)
    if (hasMore) await new Promise(r => setTimeout(r, 100))
  }

  if (!all.length) {
    console.log('[strava-sync] Aucune nouvelle activité')
    return 0
  }

  // ── Upsert des activités (sans streams) ───────────────────────
  const rows = all.map(a => toRow(a, userId))

  const { error } = await supabase
    .from('activities')
    .upsert(rows, { onConflict: 'user_id,provider,provider_id' })

  if (error) throw new Error(`Supabase upsert error: ${error.message}`)
  console.log(`[strava-sync] ${all.length} activités insérées/mises à jour`)

  // ── Récupérer les streams pour les activités récentes + courses ─
  const since90d = new Date(Date.now() - 90 * 86_400_000).toISOString()

  const { data: needStreams } = await supabase
    .from('activities')
    .select('id, provider_id, is_race, started_at')
    .eq('user_id', userId)
    .eq('provider', 'strava')
    .not('provider_id', 'is', null)
    .is('streams', null)
    .or(`started_at.gte.${since90d},is_race.eq.true`)
    .order('started_at', { ascending: false })
    .limit(100)

  let streamsSynced = 0
  for (const act of needStreams ?? []) {
    if (!act.provider_id) continue
    const streams = await fetchStreams(Number(act.provider_id), token)
    if (Object.keys(streams).length > 0) {
      await supabase
        .from('activities')
        .update({ streams })
        .eq('id', act.id)
      streamsSynced++
    }
    await new Promise(r => setTimeout(r, 200))
  }

  console.log(`[strava-sync] Streams : ${streamsSynced} activités mises à jour`)
  return all.length
}

// ── Resync streams manquants ───────────────────────────────────────

/**
 * Récupère les streams pour les activités Strava qui n'en ont pas encore.
 * Appelé via ?streams=true sur le endpoint de sync.
 */
export async function syncMissingStreams(userId: string, limit = 30): Promise<number> {
  const token = await getValidToken(userId, 'strava')
  if (!token) throw new Error('No valid Strava token')

  const supabase = createServiceClient()

  const { data: activities } = await supabase
    .from('activities')
    .select('id, provider_id')
    .eq('user_id', userId)
    .eq('provider', 'strava')
    .not('provider_id', 'is', null)
    .is('streams', null)
    .order('started_at', { ascending: false })
    .limit(limit)

  if (!activities?.length) return 0

  let synced = 0
  for (const act of activities) {
    const streams = await fetchStreams(Number(act.provider_id), token)
    if (Object.keys(streams).length > 0) {
      await supabase
        .from('activities')
        .update({ streams })
        .eq('id', act.id)
      synced++
    }
    await new Promise(r => setTimeout(r, 200))
  }

  return synced
}

// ── Mapping sport_type ─────────────────────────────────────────────

function mapStravaSportType(type: string): string {
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
    Workout: 'gym', WeightTraining: 'gym', Elliptical: 'gym',
    StairStepper: 'gym', Pilates: 'gym',
    // Autres
    CrossFit: 'crossfit',
    Yoga: 'yoga',
    HighIntensityIntervalTraining: 'hiit',
    // Ski & glisse
    AlpineSki: 'ski', BackcountrySki: 'ski', NordicSki: 'ski',
    Snowboard: 'ski', Snowshoe: 'ski', RollerSki: 'ski',
    IceSkate: 'ski', InlineSkate: 'ski',
  }
  return map[type] ?? 'other'
}
