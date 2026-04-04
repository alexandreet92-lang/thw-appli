import { NextRequest, NextResponse } from 'next/server'
import { OAUTH_CONFIG, OAuthProvider } from '@/lib/oauth/config'
import { saveTokens } from '@/lib/oauth/tokens'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://thw-appli.vercel.app'

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const code     = searchParams.get('code')
  const rawState = searchParams.get('state') ?? ''
  const error    = searchParams.get('error')

  const [provider, state] = rawState.split(':') as [OAuthProvider, string]

  if (error) {
    return NextResponse.redirect(`${BASE_URL}/profile?oauth=denied&provider=${provider}`)
  }

  if (!code || !provider || !OAUTH_CONFIG[provider]) {
    return NextResponse.redirect(`${BASE_URL}/profile?oauth=error&provider=${provider}`)
  }

  const cookieStore = await cookies()
  const savedState  = cookieStore.get(`oauth_state_${provider}`)?.value
  if (!savedState || savedState !== state) {
    return NextResponse.redirect(`${BASE_URL}/profile?oauth=invalid_state&provider=${provider}`)
  }
  cookieStore.delete(`oauth_state_${provider}`)

  const supabase = await createClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) {
    return NextResponse.redirect(`${BASE_URL}/profile?oauth=no_session`)
  }

  try {
    const cfg    = OAUTH_CONFIG[provider]
    const tokens = await exchangeCode(provider, cfg, code)
    await saveTokens(user.id, provider, tokens)

    fetch(`${BASE_URL}/api/sync/${provider}`, {
      method:  'POST',
      headers: { 'x-user-id': user.id },
    }).catch(() => {})

    return NextResponse.redirect(`${BASE_URL}/profile?oauth=connected&provider=${provider}`)
  } catch (err) {
    console.error(`OAuth callback error [${provider}]:`, err)
    return NextResponse.redirect(`${BASE_URL}/profile?oauth=error&provider=${provider}`)
  }
}

async function exchangeCode(
  provider: OAuthProvider,
  cfg: typeof OAUTH_CONFIG[OAuthProvider],
  code: string
): Promise<{ access_token: string; refresh_token?: string; expires_at?: number; provider_user_id?: string; scope?: string; provider_data?: Record<string, unknown> }> {

  if (provider === 'withings') {
    const params = new URLSearchParams({
      action:        'requesttoken',
      grant_type:    'authorization_code',
      client_id:     cfg.clientId,
      client_secret: cfg.clientSecret,
      code,
      redirect_uri:  cfg.redirectUri,
    })
    const res  = await fetch(cfg.tokenUrl, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: params })
    const json = await res.json()
    if (json.status !== 0) throw new Error(`Withings error: ${json.error}`)
    return {
      access_token:     json.body.access_token,
      refresh_token:    json.body.refresh_token,
      expires_at:       Math.floor(Date.now() / 1000) + json.body.expires_in,
      provider_user_id: String(json.body.userid),
      scope:            json.body.scope,
    }
  }

  const params = new URLSearchParams({
    grant_type:    'authorization_code',
    client_id:     cfg.clientId,
    client_secret: cfg.clientSecret,
    code,
    redirect_uri:  cfg.redirectUri,
  })
  const res  = await fetch(cfg.tokenUrl, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: params })
  if (!res.ok) throw new Error(`Token exchange failed: ${res.status}`)
  const json = await res.json()

  const providerUserId =
    provider === 'strava' ? String(json.athlete?.id ?? '') :
    provider === 'wahoo'  ? String(json.user?.id   ?? '') :
    provider === 'polar'  ? String(json.x_user_id  ?? '') : ''

  const providerData =
    provider === 'strava' ? json.athlete :
    provider === 'wahoo'  ? json.user    : {}

  return {
    access_token:     json.access_token,
    refresh_token:    json.refresh_token,
    expires_at:       json.expires_at ?? Math.floor(Date.now() / 1000) + (json.expires_in ?? 3600),
    provider_user_id: providerUserId,
    scope:            json.scope,
    provider_data:    providerData,
  }
}
