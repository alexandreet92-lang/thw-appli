import { NextResponse } from 'next/server'
import { createPublicClient, createServiceClient } from '@/lib/supabase/server'
import { getValidToken } from '@/lib/oauth/tokens'
import { getValidToken as getLegacyToken } from '@/lib/strava/tokens'

// GET /api/strava/stats
// Fetch aggregated YTD stats from Strava /athletes/{id}/stats
// getValidToken gère le refresh automatique du token oauth_tokens.
// Fallback : strava_tokens (legacy).
export async function GET() {
  const supabase = await createPublicClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let accessToken: string | null = null
  let athleteId: number | null = null

  // Tentative via oauth_tokens avec refresh automatique
  accessToken = await getValidToken(user.id, 'strava')

  if (accessToken) {
    // Récupère l'athleteId depuis provider_user_id (pas retourné par getValidToken)
    const service = createServiceClient()
    const { data: oauthRow } = await service
      .from('oauth_tokens')
      .select('provider_user_id')
      .eq('user_id', user.id)
      .eq('provider', 'strava')
      .eq('is_active', true)
      .single()
    athleteId = oauthRow?.provider_user_id
      ? parseInt(oauthRow.provider_user_id as string, 10)
      : null
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
