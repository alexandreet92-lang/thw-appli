import { NextRequest, NextResponse } from 'next/server'
import { createPublicClient } from '@/lib/supabase/server'
import { getValidToken } from '@/lib/oauth/tokens'
import { getValidToken as getLegacyToken } from '@/lib/strava/tokens'

// GET /api/strava/import-history?page=N&per_page=200
// Proxy paginé vers Strava /athlete/activities — utilisé par l'import historique côté client.
// Gère les deux stores de tokens : oauth_tokens (nouveau, avec refresh auto) et strava_tokens (legacy).
export async function GET(req: NextRequest) {
  const supabase = await createPublicClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const url      = new URL(req.url)
  const page     = url.searchParams.get('page')     ?? '1'
  const per_page = url.searchParams.get('per_page') ?? '200'

  // getValidToken gère le refresh automatique si le token est expiré
  let accessToken: string | null = await getValidToken(user.id, 'strava')

  // Fallback : strava_tokens (legacy)
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
