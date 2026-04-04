import { NextRequest, NextResponse } from 'next/server'
import { STRAVA_CONFIG } from '@/lib/strava/config'
import { saveTokens } from '@/lib/strava/tokens'
import { createPublicClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

// GET /api/auth/strava/callback
// Réception du code OAuth Strava après autorisation
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code  = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  const redirectBase = new URL('/profile', req.url)

  // Accès refusé par l'utilisateur
  if (error) {
    redirectBase.searchParams.set('strava', 'denied')
    return NextResponse.redirect(redirectBase)
  }

  if (!code) {
    redirectBase.searchParams.set('strava', 'error')
    return NextResponse.redirect(redirectBase)
  }

  // Vérification CSRF state
  const cookieStore = await cookies()
  const savedState  = cookieStore.get('strava_oauth_state')?.value
  if (state && savedState && state !== savedState) {
    redirectBase.searchParams.set('strava', 'invalid_state')
    return NextResponse.redirect(redirectBase)
  }
  cookieStore.delete('strava_oauth_state')

  try {
    // Échange du code contre les tokens
    const tokenRes = await fetch(STRAVA_CONFIG.tokenUrl, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        client_id:     STRAVA_CONFIG.clientId,
        client_secret: STRAVA_CONFIG.clientSecret,
        code,
        grant_type:    'authorization_code',
      }),
    })

    if (!tokenRes.ok) {
      redirectBase.searchParams.set('strava', 'token_error')
      return NextResponse.redirect(redirectBase)
    }

    const tokenData = await tokenRes.json()

    // Vérification session Supabase
    const supabase = await createPublicClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      redirectBase.searchParams.set('strava', 'no_session')
      return NextResponse.redirect(redirectBase)
    }

    // Sauvegarde des tokens
    await saveTokens(user.id, {
      access_token:  tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      expires_at:    tokenData.expires_at,
      athlete_id:    tokenData.athlete.id,
      scope:         tokenData.scope,
      athlete:       tokenData.athlete,
    })

    redirectBase.searchParams.set('strava', 'connected')
    return NextResponse.redirect(redirectBase)
  } catch (err) {
    console.error('[strava/callback]', err)
    redirectBase.searchParams.set('strava', 'error')
    return NextResponse.redirect(redirectBase)
  }
}
