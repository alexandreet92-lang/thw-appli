import { NextRequest, NextResponse } from 'next/server'
import { createPublicClient, createServiceClient } from '@/lib/supabase/server'
import { getValidToken } from '@/lib/strava/tokens'

// Interface for Strava lap response
interface StravaLap {
  lap_index:            number
  distance:             number
  moving_time:          number
  elapsed_time:         number
  start_index:          number
  end_index:            number
  average_watts?:       number | null
  max_watts?:           number | null
  average_heartrate?:   number | null
  max_heartrate?:       number | null
  average_cadence?:     number | null
  average_speed?:       number | null
  total_elevation_gain?:number | null
}

// Our LapData shape (must match LapData interface in page.tsx)
interface LapData {
  lap_index?:       number
  start_index?:     number
  end_index?:       number
  distance_m:       number
  moving_time_s:    number
  elapsed_time_s?:  number | null
  avg_hr?:          number | null
  max_heartrate?:   number | null
  avg_speed_ms?:    number | null
  avg_watts?:       number | null
  max_watts?:       number | null
  avg_cadence?:     number | null
  elevation_gain_m?:number | null
}

function mapLap(lap: StravaLap): LapData {
  return {
    lap_index:        lap.lap_index,
    start_index:      lap.start_index,
    end_index:        lap.end_index,
    distance_m:       lap.distance,
    moving_time_s:    lap.moving_time,
    elapsed_time_s:   lap.elapsed_time ?? null,
    avg_hr:           lap.average_heartrate ?? null,
    max_heartrate:    lap.max_heartrate ?? null,
    avg_speed_ms:     lap.average_speed ?? null,
    avg_watts:        lap.average_watts ?? null,
    max_watts:        lap.max_watts ?? null,
    avg_cadence:      lap.average_cadence ?? null,
    elevation_gain_m: lap.total_elevation_gain ?? null,
  }
}

// GET /api/strava/activity-laps?activity_id={uuid}
// Lazy-load des laps pour une activité cyclisme.
// Cache dans activities.laps (JSONB) après le premier fetch.
export async function GET(req: NextRequest) {
  const supabase = await createPublicClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const activityId = searchParams.get('activity_id')
  if (!activityId) {
    return NextResponse.json({ error: 'activity_id requis' }, { status: 400 })
  }

  const serviceClient = createServiceClient()

  // 1. Récupérer l'activité
  const { data: activity } = await serviceClient
    .from('activities')
    .select('provider_id, provider, laps')
    .eq('id', activityId)
    .eq('user_id', user.id)
    .single()

  if (!activity) {
    return NextResponse.json({ error: 'Activité non trouvée' }, { status: 404 })
  }

  // 2. Laps déjà en cache et multiples → retourner directement
  const cached = activity.laps as LapData[] | null
  if (cached && Array.isArray(cached) && cached.length > 1) {
    return NextResponse.json({ laps: cached })
  }

  // 3. Uniquement pour les activités Strava
  if (activity.provider !== 'strava' || !activity.provider_id) {
    return NextResponse.json({ laps: [] })
  }

  // 4. Token Strava valide (auto-refresh inclus)
  const token = await getValidToken(user.id)
  if (!token) {
    console.error('[activity-laps] token Strava indisponible pour user', user.id)
    return NextResponse.json({ error: 'Token Strava non disponible' }, { status: 503 })
  }
  const headers = { Authorization: `Bearer ${token.access_token}` }

  const cacheLaps = async (laps: LapData[]) => {
    if (laps.length > 0) {
      await serviceClient.from('activities').update({ laps }).eq('id', activityId)
    }
  }

  // 5. Fetch depuis l'API Strava — endpoint dédié /laps
  const res = await fetch(
    `https://www.strava.com/api/v3/activities/${activity.provider_id}/laps`,
    { headers },
  )

  if (res.ok) {
    const raw = await res.json()
    if (Array.isArray(raw)) {
      const laps = (raw as StravaLap[]).map(mapLap)
      await cacheLaps(laps)
      return NextResponse.json({ laps })
    }
    return NextResponse.json({ laps: [] })
  }

  console.error('[activity-laps] /laps a échoué', res.status, 'provider_id', activity.provider_id)
  if (res.status === 404) return NextResponse.json({ laps: [] })

  // 6. Fallback : endpoint détaillé de l'activité (contient aussi "laps")
  try {
    const detRes = await fetch(
      `https://www.strava.com/api/v3/activities/${activity.provider_id}?include_all_efforts=false`,
      { headers },
    )
    if (detRes.ok) {
      const det = await detRes.json() as { laps?: StravaLap[] }
      const laps = Array.isArray(det.laps) ? det.laps.map(mapLap) : []
      await cacheLaps(laps)
      return NextResponse.json({ laps })
    }
    console.error('[activity-laps] fallback /activities a échoué', detRes.status)
  } catch (e) {
    console.error('[activity-laps] fallback exception', e)
  }

  const status = res.status === 429 ? 429 : 502
  return NextResponse.json({ error: `Erreur API Strava (${res.status})` }, { status })
}
