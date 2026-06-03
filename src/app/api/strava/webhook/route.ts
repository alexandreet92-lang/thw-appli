// ══════════════════════════════════════════════════════════════════
// STRAVA WEBHOOK — src/app/api/strava/webhook/route.ts
//
// GET  : vérification de l'abonnement (hub.mode=subscribe)
// POST : réception des événements push Strava
//        → filtre create/activity, upsert dans Supabase
// ══════════════════════════════════════════════════════════════════

import { createServiceClient } from '@/lib/supabase/server'
import { getValidToken }       from '@/lib/oauth/tokens'
import { triggerRecordsProcessing } from '@/lib/records/triggerRecordsProcessing'

// ── Types Strava ──────────────────────────────────────────────────

interface StravaWebhookEvent {
  object_type: string   // 'activity' | 'athlete'
  aspect_type: string   // 'create' | 'update' | 'delete'
  object_id:   number   // activity ID
  owner_id:    number   // athlete ID
}

interface StravaActivityDetail {
  id:                   number
  name:                 string
  sport_type:           string
  type:                 string
  start_date:           string
  elapsed_time:         number
  moving_time:          number
  distance:             number
  total_elevation_gain: number | null
  average_speed:        number | null
  average_watts:        number | null
  kilojoules:           number | null
  average_heartrate:    number | null
  max_heartrate:        number | null
  average_cadence:      number | null
  calories:             number | null
  suffer_score:         number | null
  trainer:              boolean
  commute:              boolean
  average_temp:         number | null
  workout_type:         number | null
  map?:                 { summary_polyline?: string | null; polyline?: string | null } | null
}

interface StravaStream {
  data: number[]
}

// ── Sport type mapping (même logique que src/lib/sync/strava.ts) ──

function mapStravaSportType(type: string): string {
  const map: Record<string, string> = {
    Run: 'run', VirtualRun: 'run',
    TrailRun: 'trail_run', Hike: 'trail_run',
    Ride: 'bike', MountainBikeRide: 'bike', GravelRide: 'bike',
    EBikeRide: 'bike', EMountainBikeRide: 'bike', Handcycle: 'bike', Velomobile: 'bike',
    VirtualRide: 'virtual_bike',
    Swim: 'swim', OpenWaterSwim: 'open_water_swim',
    Rowing: 'rowing', VirtualRow: 'rowing', Canoeing: 'rowing', Kayaking: 'rowing',
    Workout: 'gym', WeightTraining: 'gym', Elliptical: 'gym',
    StairStepper: 'gym', Pilates: 'gym',
    CrossFit: 'crossfit',
    Yoga: 'yoga',
    HighIntensityIntervalTraining: 'hiit',
    AlpineSki: 'ski', BackcountrySki: 'ski', NordicSki: 'ski',
    Snowboard: 'ski', Snowshoe: 'ski', RollerSki: 'ski',
    IceSkate: 'ski', InlineSkate: 'ski',
  }
  return map[type] ?? 'other'
}

// ── GET — vérification de l'abonnement Strava ─────────────────────

export async function GET(req: Request) {
  const url       = new URL(req.url)
  const mode      = url.searchParams.get('hub.mode')
  const token     = url.searchParams.get('hub.verify_token')
  const challenge = url.searchParams.get('hub.challenge')

  const VERIFY_TOKEN = process.env.STRAVA_WEBHOOK_VERIFY_TOKEN
  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    return Response.json({ 'hub.challenge': challenge })
  }
  return new Response('Forbidden', { status: 403 })
}

// ── POST — réception d'un événement Strava ────────────────────────

export async function POST(req: Request) {
  let event: StravaWebhookEvent
  try {
    event = await req.json() as StravaWebhookEvent
  } catch {
    return new Response('Bad Request', { status: 400 })
  }

  console.log(`[strava-webhook] event: ${event.object_type}/${event.aspect_type} id=${event.object_id}`)

  // Seulement les nouvelles activités
  if (event.object_type !== 'activity' || event.aspect_type !== 'create') {
    return Response.json({ ok: true })
  }

  const athleteId  = event.owner_id
  const activityId = event.object_id

  const supabase = createServiceClient()

  // Trouver le user THW via oauth_tokens.provider_user_id
  const { data: tokenRow } = await supabase
    .from('oauth_tokens')
    .select('user_id')
    .eq('provider', 'strava')
    .eq('provider_user_id', String(athleteId))
    .eq('is_active', true)
    .single()

  if (!tokenRow) {
    console.warn(`[strava-webhook] No user found for athlete ${athleteId}`)
    return Response.json({ ok: true })
  }

  const userId = tokenRow.user_id as string

  // Récupérer un token valide (refresh auto si expiré)
  const accessToken = await getValidToken(userId, 'strava')
  if (!accessToken) {
    console.error(`[strava-webhook] No valid token for user ${userId}`)
    return Response.json({ ok: true })
  }

  // Fetcher le détail de l'activité
  const actRes = await fetch(
    `https://www.strava.com/api/v3/activities/${activityId}`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  )
  if (!actRes.ok) {
    console.error(`[strava-webhook] Activity fetch failed: ${actRes.status}`)
    return Response.json({ ok: true })
  }
  const activity = await actRes.json() as StravaActivityDetail

  // Fetcher les streams
  const streamsRes = await fetch(
    `https://www.strava.com/api/v3/activities/${activityId}/streams` +
    `?keys=time,distance,altitude,heartrate,velocity_smooth,watts,cadence,temp&key_by_type=true`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  )
  const streamsRaw = streamsRes.ok
    ? await streamsRes.json() as Record<string, StravaStream>
    : {}

  const streams = {
    altitude:  streamsRaw.altitude?.data          ?? null,
    heartrate: streamsRaw.heartrate?.data         ?? null,
    velocity:  streamsRaw.velocity_smooth?.data   ?? null,
    watts:     streamsRaw.watts?.data             ?? null,
    cadence:   streamsRaw.cadence?.data           ?? null,
    temp:      streamsRaw.temp?.data              ?? null,
    distance:  streamsRaw.distance?.data          ?? null,
    time:      streamsRaw.time?.data              ?? null,
  }

  // Upsert dans activities (même mapping que src/lib/sync/strava.ts toRow)
  const row = {
    user_id:           userId,
    provider:          'strava',
    provider_id:       String(activity.id),
    sport_type:        mapStravaSportType(activity.sport_type ?? activity.type),
    title:             activity.name,
    started_at:        activity.start_date,
    elapsed_time_s:    activity.elapsed_time,
    moving_time_s:     activity.moving_time,
    distance_m:        activity.distance                ?? null,
    elevation_gain_m:  activity.total_elevation_gain    ?? null,
    average_speed:     activity.average_speed           ?? null,
    avg_watts:         activity.average_watts           ?? null,
    kilojoules:        activity.kilojoules              ?? null,
    average_heartrate: activity.average_heartrate       ?? null,
    max_heartrate:     activity.max_heartrate           ?? null,
    avg_cadence:       activity.average_cadence         ?? null,
    calories:          activity.calories                ?? null,
    tss:               activity.suffer_score            ?? null,
    trainer:           activity.trainer                 ?? false,
    commute:           activity.commute                 ?? false,
    avg_temp_c:        activity.average_temp            ?? null,
    is_race:           activity.workout_type === 1,
    streams:           Object.values(streams).some(v => v !== null) ? streams : null,
    summary_polyline:  activity.map?.summary_polyline ?? activity.map?.polyline ?? null,
  }

  const { data: upserted, error } = await supabase
    .from('activities')
    .upsert(row, { onConflict: 'user_id,provider,provider_id' })
    .select('id, sport_type')
    .single()

  if (error) {
    console.error(`[strava-webhook] Upsert error: ${error.message}`)
  } else {
    console.log(`[strava-webhook] ✅ Activity ${activityId} upserted for user ${userId}`)
    // Déclenchement records (non bloquant, ignoré si pas bike)
    if (upserted?.id) {
      await triggerRecordsProcessing({
        activityId: upserted.id as string,
        userId,
        sport:      (upserted.sport_type as string | null) ?? row.sport_type,
      })
    }
  }

  return Response.json({ ok: true })
}
