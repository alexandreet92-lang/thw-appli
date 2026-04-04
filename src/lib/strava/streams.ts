import { createServiceClient } from '@/lib/supabase/server'
import { getValidToken } from './tokens'

// Clés de streams demandées à Strava
const STREAM_KEYS = 'time,distance,altitude,heartrate,velocity_smooth,watts,cadence,temp'

export interface StreamData {
  time?:      number[]
  distance?:  number[]
  altitude?:  number[]
  heartrate?: number[]
  velocity?:  number[]
  watts?:     number[]
  cadence?:   number[]
  temp?:      number[]
}

// Transforme la réponse Strava (array) en objet indexé par type
function parseStravaStreams(raw: any[]): StreamData {
  const result: StreamData = {}
  for (const stream of raw) {
    switch (stream.type) {
      case 'time':              result.time      = stream.data; break
      case 'distance':          result.distance  = stream.data; break
      case 'altitude':          result.altitude  = stream.data; break
      case 'heartrate':         result.heartrate = stream.data; break
      case 'velocity_smooth':   result.velocity  = stream.data; break
      case 'watts':             result.watts     = stream.data; break
      case 'cadence':           result.cadence   = stream.data; break
      case 'temp':              result.temp      = stream.data; break
    }
  }
  return result
}

// Fetch les streams depuis Strava et les stocke dans activities.streams
// Stratégie lazy-load : appelé uniquement à l'ouverture du détail
export async function fetchAndStoreStreams(
  userId: string,
  activityId: string  // UUID de la table activities
): Promise<StreamData | null> {
  const supabase = createServiceClient()

  // 1. Récupère l'activité pour avoir le provider_id (strava activity ID)
  const { data: activity } = await supabase
    .from('activities')
    .select('provider_id, provider, streams')
    .eq('id', activityId)
    .eq('user_id', userId)
    .single()

  if (!activity) return null

  // 2. Streams déjà stockés → retourner directement (cache)
  if (activity.streams && Object.keys(activity.streams).length > 0) {
    return activity.streams as StreamData
  }

  // 3. Seulement pour les activités Strava
  if (activity.provider !== 'strava' || !activity.provider_id) return null

  // 4. Fetch depuis l'API Strava
  const token = await getValidToken(userId)
  if (!token) return null

  const res = await fetch(
    `https://www.strava.com/api/v3/activities/${activity.provider_id}/streams?keys=${STREAM_KEYS}&key_by_type=false`,
    { headers: { Authorization: `Bearer ${token.access_token}` } }
  )

  if (!res.ok) {
    // 404 = pas de streams (activité manuelle, montre sans capteurs)
    if (res.status === 404) return null
    throw new Error(`Strava streams error: ${res.status}`)
  }

  const raw = await res.json()
  const streams = parseStravaStreams(Array.isArray(raw) ? raw : [])

  // 5. Stockage en DB (cache pour les prochains appels)
  if (Object.keys(streams).length > 0) {
    await supabase
      .from('activities')
      .update({ streams })
      .eq('id', activityId)
  }

  return streams
}

// Supprime les streams d'une activité (utile pour re-fetch)
export async function clearStreams(userId: string, activityId: string) {
  const supabase = createServiceClient()
  await supabase
    .from('activities')
    .update({ streams: null })
    .eq('id', activityId)
    .eq('user_id', userId)
}
