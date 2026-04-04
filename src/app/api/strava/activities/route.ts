import { NextRequest, NextResponse } from 'next/server'
import { getStoredActivities, syncStravaActivities } from '@/lib/strava/activities'
import { createPublicClient } from '@/lib/supabase/server'

// GET /api/strava/activities?limit=20&offset=0&sport_type=run
// Lecture des activités stockées en DB
export async function GET(req: NextRequest) {
  const supabase = await createPublicClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  try {
    const activities = await getStoredActivities(user.id, {
      limit:     parseInt(searchParams.get('limit')  ?? '20'),
      offset:    parseInt(searchParams.get('offset') ?? '0'),
      sportType: searchParams.get('sport_type') ?? undefined,
    })
    return NextResponse.json({ activities, count: activities.length })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

// POST /api/strava/activities
// Déclenche une synchronisation Strava → Supabase
export async function POST() {
  const supabase = await createPublicClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const count = await syncStravaActivities(user.id)
    return NextResponse.json({ synced: count, message: `${count} activité(s) synchronisée(s)` })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
