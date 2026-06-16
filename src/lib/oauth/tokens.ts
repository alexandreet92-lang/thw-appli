import { createServiceClient } from '@/lib/supabase/server'
import { OAUTH_CONFIG, OAuthProvider } from './config'

export interface TokenData {
  access_token:      string
  refresh_token?:    string | null
  expires_at?:       number | null
  provider_user_id?: string
  scope?:            string
  provider_data?:    Record<string, unknown>
}

interface OAuthTokenRow {
  id:            string
  access_token:  string
  refresh_token: string | null
  expires_at:    number | null
  provider:      string
}

export async function saveTokens(
  userId: string,
  provider: OAuthProvider,
  data: TokenData
): Promise<void> {
  const supabase = createServiceClient()
  const { error } = await supabase.from('oauth_tokens').upsert({
    user_id:          userId,
    provider,
    access_token:     data.access_token,
    refresh_token:    data.refresh_token    ?? null,
    expires_at:       data.expires_at       ?? null,
    provider_user_id: data.provider_user_id ?? null,
    scope:            data.scope            ?? null,
    provider_data:    data.provider_data    ?? {},
    is_active:        true,
    last_error:       null,
    last_used_at:     new Date().toISOString(),
    updated_at:       new Date().toISOString(),
  }, { onConflict: 'user_id,provider' })
  if (error) throw new Error(`saveTokens error: ${error.message}`)
}

export async function getValidToken(
  userId: string,
  provider: OAuthProvider
): Promise<string | null> {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('oauth_tokens')
    .select('id, access_token, refresh_token, expires_at')
    .eq('user_id', userId)
    .eq('provider', provider)
    .eq('is_active', true)
    .single()

  if (error || !data) return null

  const row = data as OAuthTokenRow
  const now = Math.floor(Date.now() / 1000)
  const isExpired = row.expires_at !== null && row.expires_at < now + 300

  if (!isExpired) {
    await supabase
      .from('oauth_tokens')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', row.id)
    return row.access_token
  }

  // Pas de refresh_token → impossible de rafraîchir : reconnexion requise.
  if (!row.refresh_token) {
    await supabase
      .from('oauth_tokens')
      .update({ is_active: false, last_error: 'reconnect_required', updated_at: new Date().toISOString() })
      .eq('id', row.id)
    return null
  }

  const refreshed = await doRefreshToken(provider, row.refresh_token)
  if ('error' in refreshed) {
    // 400/401 = token révoqué/non-rafraîchissable → on désactive la source pour
    // que l'UI propose "Reconnecter". Erreur transitoire (réseau/5xx) → on garde
    // la source active et on retentera au prochain appel.
    const reconnect = refreshed.error === 'reconnect_required'
    await supabase
      .from('oauth_tokens')
      .update({
        ...(reconnect ? { is_active: false } : {}),
        last_error: reconnect ? 'reconnect_required' : 'refresh_failed',
        updated_at: new Date().toISOString(),
      })
      .eq('id', row.id)
    return null
  }

  await supabase.from('oauth_tokens').update({
    access_token:  refreshed.access_token,
    refresh_token: refreshed.refresh_token ?? row.refresh_token,
    expires_at:    refreshed.expires_at,
    last_error:    null,
    is_active:     true,
    last_used_at:  new Date().toISOString(),
    updated_at:    new Date().toISOString(),
  }).eq('id', row.id)

  return refreshed.access_token
}

type RefreshSuccess = { access_token: string; refresh_token?: string; expires_at: number }
type RefreshFailure = { error: 'reconnect_required' | 'transient' }
type RefreshOutcome = RefreshSuccess | RefreshFailure

async function doRefreshToken(
  provider: OAuthProvider,
  refreshToken: string
): Promise<RefreshOutcome> {
  const cfg = OAUTH_CONFIG[provider]
  try {
    if (provider === 'withings') {
      const params = new URLSearchParams({
        action:        'requesttoken',
        grant_type:    'refresh_token',
        client_id:     cfg.clientId,
        client_secret: cfg.clientSecret,
        refresh_token: refreshToken,
      })
      const res  = await fetch(cfg.tokenUrl, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: params })
      const json = await res.json()
      if (json.status !== 0) {
        console.error(`[doRefreshToken:withings] status=${json.status} error=${json.error ?? ''}`)
        return { error: 'transient' }
      }
      return {
        access_token:  json.body.access_token,
        refresh_token: json.body.refresh_token,
        expires_at:    Math.floor(Date.now() / 1000) + json.body.expires_in,
      }
    }

    // Polar v4 : Basic Auth (client_id:client_secret en header, pas en body),
    // body x-www-form-urlencoded grant_type=refresh_token&refresh_token=…
    if (provider === 'polar') {
      const basicAuth = Buffer.from(`${cfg.clientId}:${cfg.clientSecret}`).toString('base64')
      const params = new URLSearchParams({
        grant_type:    'refresh_token',
        refresh_token: refreshToken,
      })
      const res = await fetch(cfg.tokenUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${basicAuth}`,
          'Content-Type':  'application/x-www-form-urlencoded',
          'Accept':        'application/json',
        },
        body: params,
      })
      if (!res.ok) {
        // Diagnostic : on logge la VRAIE cause (sans le secret) — URL, grant_type,
        // statut HTTP et body brut renvoyé par Polar.
        const body = await res.text().catch(() => '')
        console.error(
          `[doRefreshToken:polar] POST ${cfg.tokenUrl} grant_type=refresh_token → HTTP ${res.status} | body: ${body}`,
        )
        // 400/401 = invalid_grant / token révoqué → reconnexion requise.
        return { error: res.status === 400 || res.status === 401 ? 'reconnect_required' : 'transient' }
      }
      const json = await res.json() as Record<string, unknown>
      return {
        access_token:  String(json['access_token'] ?? ''),
        refresh_token: json['refresh_token'] ? String(json['refresh_token']) : undefined,
        expires_at:    json['expires_in']
          ? Math.floor(Date.now() / 1000) + Number(json['expires_in'])
          : Math.floor(Date.now() / 1000) + 3600,
      }
    }

    // Standard OAuth (Strava, Wahoo)
    const params = new URLSearchParams({
      grant_type:    'refresh_token',
      refresh_token: refreshToken,
      client_id:     cfg.clientId,
      client_secret: cfg.clientSecret,
    })
    const res = await fetch(cfg.tokenUrl, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: params })
    if (!res.ok) {
      console.error(`[doRefreshToken:${provider}] HTTP ${res.status}`)
      return { error: res.status === 400 || res.status === 401 ? 'reconnect_required' : 'transient' }
    }
    const json = await res.json()
    return {
      access_token:  json.access_token,
      refresh_token: json.refresh_token,
      expires_at:    json.expires_at ?? Math.floor(Date.now() / 1000) + (json.expires_in ?? 3600),
    }
  } catch (e) {
    console.error(`[doRefreshToken:${provider}] network error: ${e instanceof Error ? e.message : String(e)}`)
    return { error: 'transient' }
  }
}

export async function revokeToken(userId: string, provider: OAuthProvider): Promise<void> {
  const supabase = createServiceClient()
  await supabase.from('oauth_tokens').delete().eq('user_id', userId).eq('provider', provider)
}

export async function getConnectedProviders(userId: string): Promise<string[]> {
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('oauth_tokens')
    .select('provider')
    .eq('user_id', userId)
    .eq('is_active', true)
  return (data ?? []).map((r: { provider: string }) => r.provider)
}
