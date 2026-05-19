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
    return NextResponse.redirect(`${BASE_URL}/connections?oauth=denied&provider=${provider}`)
  }

  if (!code || !provider || !OAUTH_CONFIG[provider]) {
    return NextResponse.redirect(`${BASE_URL}/connections?oauth=error&provider=${provider}`)
  }

  const cookieStore = await cookies()
  const savedState  = cookieStore.get(`oauth_state_${provider}`)?.value
  if (!savedState || savedState !== state) {
    return NextResponse.redirect(`${BASE_URL}/connections?oauth=invalid_state&provider=${provider}`)
  }
  cookieStore.delete(`oauth_state_${provider}`)

  const supabase = await createClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) {
    return NextResponse.redirect(`${BASE_URL}/connections?oauth=no_session`)
  }

  try {
    const cfg    = OAUTH_CONFIG[provider]
    // ── DEBUG callback entry ───────────────────────────────────
    console.log(`[oauth/callback] provider=${provider}`)
    console.log(`[oauth/callback] code received: ${code ? code.slice(0,12)+'…' : 'MISSING'}`)
    console.log(`[oauth/callback] redirectUri: "${cfg.redirectUri}"`)
    console.log(`[oauth/callback] clientId exists: ${!!cfg.clientId} (len=${cfg.clientId.length})`)
    console.log(`[oauth/callback] clientSecret exists: ${!!cfg.clientSecret}`)
    // ──────────────────────────────────────────────────────────
    const tokens = await exchangeCode(provider, cfg, code)
    // ── DEBUG token result ─────────────────────────────────────
    console.log(`[oauth/callback] token exchange OK — access_token exists: ${!!tokens.access_token}, provider_user_id: ${tokens.provider_user_id ?? 'none'}, expires_at: ${tokens.expires_at ?? 'null'}`)
    // ──────────────────────────────────────────────────────────
    await saveTokens(user.id, provider, tokens)

    // Polar: register user with AccessLink immediately (required before any data call)
    if (provider === 'polar') {
      try {
        const { registerPolarUser } = await import('@/lib/sync/polar')
        await registerPolarUser(user.id)
      } catch {
        // 409 = already registered — not an error
      }
    }

    fetch(`${BASE_URL}/api/sync/${provider}`, {
      method:  'POST',
      headers: { 'x-user-id': user.id },
    }).catch(() => {})

    return NextResponse.redirect(`${BASE_URL}/connections?oauth=connected&provider=${provider}`)
  } catch (err) {
    console.error(`OAuth callback error [${provider}]:`, err)
    return NextResponse.redirect(`${BASE_URL}/connections?oauth=error&provider=${provider}`)
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

  // ── DEBUG token request ────────────────────────────────────────
  console.log(`[exchangeCode:${provider}] POST ${cfg.tokenUrl}`)
  console.log(`[exchangeCode:${provider}] body (sans secret): grant_type=authorization_code&client_id=${cfg.clientId}&code=${code ? code.slice(0,12)+'…' : 'MISSING'}&redirect_uri=${cfg.redirectUri}`)
  if (provider === 'polar') {
    const basicAuth = Buffer.from(`${cfg.clientId}:${cfg.clientSecret}`).toString('base64')
    console.log(`[exchangeCode:polar] using Basic Auth header: Basic ${basicAuth.slice(0,8)}…`)
    // Polar requires Basic Auth, not body params for client credentials
    const polarRes = await fetch(cfg.tokenUrl, {
      method:  'POST',
      headers: {
        'Authorization':  `Basic ${basicAuth}`,
        'Content-Type':   'application/x-www-form-urlencoded',
        'Accept':         'application/json',
      },
      body: new URLSearchParams({
        grant_type:   'authorization_code',
        code,
        redirect_uri: cfg.redirectUri,
      }),
    })
    const polarBody = await polarRes.text()
    console.log(`[exchangeCode:polar] response status: ${polarRes.status}`)
    console.log(`[exchangeCode:polar] response body: ${polarBody}`)
    if (!polarRes.ok) throw new Error(`Polar token exchange failed ${polarRes.status}: ${polarBody}`)
    const polarJson = JSON.parse(polarBody)
    return {
      access_token:     polarJson.access_token,
      refresh_token:    polarJson.refresh_token ?? null,
      expires_at:       null,   // Polar tokens never expire
      provider_user_id: String(polarJson.x_user_id ?? ''),
      scope:            polarJson.scope ?? cfg.scope,
      provider_data:    {},
    }
  }
  // ──────────────────────────────────────────────────────────────

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

  // Polar tokens do not expire — store null to prevent spurious refresh attempts
  const expiresAt = provider === 'polar'
    ? null
    : (json.expires_at ?? Math.floor(Date.now() / 1000) + (json.expires_in ?? 3600))

  return {
    access_token:     json.access_token,
    refresh_token:    json.refresh_token ?? null,
    expires_at:       expiresAt,
    provider_user_id: providerUserId,
    scope:            json.scope,
    provider_data:    providerData,
  }
}
