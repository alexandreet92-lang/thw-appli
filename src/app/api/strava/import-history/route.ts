import { NextRequest, NextResponse } from 'next/server'
import { createPublicClient, createServiceClient } from '@/lib/supabase/server'
import { getValidToken as getLegacyToken } from '@/lib/strava/tokens'

// GET /api/strava/import-history?page=N&per_page=200
// Proxy paginé vers Strava /athlete/activities — utilisé par l'import historique côté client.
// Gère les deux stores de tokens : oauth_tokens (nouveau) et strava_tokens (legacy).
export async function GET(req: NextRequest) {
  const supabase = await createPublicClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const url      = new URL(req.url)
  const page     = url.searchParams.get('page')     ?? '1'
  const per_page = url.searchParams.get('per_page') ?? '200'

  // Token : oauth_tokens en priorité, fallback strava_tokens
  let accessToken: string | null = null
  const service = createServiceClient()

  const { data: oauthRow } = await service
    .from('oauth_tokens')
    .select('access_token, expires_at')
    .eq('user_id', user.id)
    .eq('provider', 'strava')
    .eq('is_active', true)
    .single()

  if (oauthRow) {
    const now       = Math.floor(Date.now() / 1000)
    const isExpired = oauthRow.expires_at !== null && (oauthRow.expires_at as number) < now + 300
    if (!isExpired) accessToken = oauthRow.access_token as string
  }

  if (!accessToken) {
    const legacy = await getLegacyToken(user.id)
    if (legacy) accessToken = legacy.access_token
  }

  if (!accessToken) return NextResponse.json({ error: 'not_connected' }, { status: 403 })

  const res = await fetch(
    `https://www.strava.com/api/v3/athlete/activities?page=${page}&per_page=${per_page}`,
    { headers: { Authorization: `Bearer ${accessToken}` }, cache: 'no-store' }
  )

  if (!res.ok) {
    return NextResponse.json(
      { error: 'strava_error', strava_status: res.status },
      { status: 502 }
    )
  }

  return NextResponse.json(await res.json())
}
