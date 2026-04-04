import { NextRequest, NextResponse } from 'next/server'
import { fetchAndStoreStreams } from '@/lib/strava/streams'
import { createPublicClient } from '@/lib/supabase/server'

// GET /api/strava/streams?activity_id={uuid}
// Lazy-load des données de courbes pour une activité
// Fetch depuis Strava si pas en cache, stocke en DB, retourne les données
export async function GET(req: NextRequest) {
  const supabase = await createPublicClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const activityId = searchParams.get('activity_id')

  if (!activityId) {
    return NextResponse.json({ error: 'activity_id required' }, { status: 400 })
  }

  try {
    const streams = await fetchAndStoreStreams(user.id, activityId)
    if (!streams) {
      return NextResponse.json({ streams: null, message: 'No streams available' })
    }
    return NextResponse.json({ streams })
  } catch (err) {
    console.error('[strava/streams]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
