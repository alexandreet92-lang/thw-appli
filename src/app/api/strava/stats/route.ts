import { NextResponse } from 'next/server'
import { createPublicClient } from '@/lib/supabase/server'
import { getValidToken } from '@/lib/strava/tokens'

// GET /api/strava/stats
// Fetch aggregated YTD stats from Strava /athletes/{id}/stats
// Returns run + ride + swim YTD totals — no individual activities imported
export async function GET() {
  const supabase = await createPublicClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const token = await getValidToken(user.id)
  if (!token) return NextResponse.json({ error: 'not_connected' }, { status: 403 })

  const res = await fetch(
    `https://www.strava.com/api/v3/athletes/${token.athlete_id}/stats`,
    {
      headers: { Authorization: `Bearer ${token.access_token}` },
      cache: 'no-store',
    }
  )
  if (!res.ok) {
    return NextResponse.json(
      { error: 'strava_error', strava_status: res.status },
      { status: 502 }
    )
  }

  const data = await res.json()
  return NextResponse.json(data)
}
