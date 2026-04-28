import { NextResponse } from 'next/server'
import { createPublicClient, createServiceClient } from '@/lib/supabase/server'
import { getValidToken as getLegacyToken } from '@/lib/strava/tokens'

// GET /api/strava/stats
// Fetch aggregated YTD stats from Strava /athletes/{id}/stats
// Checks oauth_tokens first (new OAuth flow), falls back to strava_tokens (legacy)
export async function GET() {
  const supabase = await createPublicClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let accessToken: string | null = null
  let athleteId: number | null = null

  // Try new OAuth system (oauth_tokens table) first
  const service = createServiceClient()
  const { data: oauthRow } = await service
    .from('oauth_tokens')
    .select('access_token, refresh_token, expires_at, provider_user_id')
    .eq('user_id', user.id)
    .eq('provider', 'strava')
    .eq('is_active', true)
    .single()

  if (oauthRow) {
    const now = Math.floor(Date.now() / 1000)
    const isExpired = oauthRow.expires_at !== null && oauthRow.expires_at < now + 300
    if (!isExpired) {
      accessToken = oauthRow.access_token as string
      athleteId   = oauthRow.provider_user_id ? parseInt(oauthRow.provider_user_id as string, 10) : null
    }
  }

  // Fallback: legacy strava_tokens table
  if (!accessToken) {
    const legacy = await getLegacyToken(user.id)
    if (legacy) {
      accessToken = legacy.access_token
      athleteId   = legacy.athlete_id
    }
  }

  if (!accessToken || !athleteId) {
    return NextResponse.json({ error: 'not_connected' }, { status: 403 })
  }

  const res = await fetch(
    `https://www.strava.com/api/v3/athletes/${athleteId}/stats`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
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
