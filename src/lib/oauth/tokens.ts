import { createServiceClient } from '@/lib/supabase/server'
import { OAUTH_CONFIG, OAuthProvider } from './config'

export interface TokenData {
  access_token:     string
  refresh_token?:   string
  expires_at?:      number
  provider_user_id?: string
  scope?:           string
  provider_data?:   Record<string, unknown>
}

// Sauvegarde ou met à jour les tokens en DB
export async function saveTokens(
  userId: string,
  provider: OAuthProvider,
  data: TokenData
): Promise<void> {
  const supabase = createServiceClient()

  const { error } = await supabase
    .from('oauth_tokens')
    .upsert({
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

// Récupère un token valide, refresh si expiré
export async function getValidToken(
  userId: string,
  provider: OAuthProvider
): Promise<string | null> {
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('oauth_tokens')
    .select('*')
    .eq('user_id', userId)
    .eq('provider', provider)
    .eq('is_active', true)
    .single()

  if (error || !data) return null

  const now = Math.floor(Date.now() / 1000)
  const isExpired = data.expires_at && data.expires_at < now + 300

  if (!isExpired) {
    // Mise à jour last_used_at
    await supabase
      .from('oauth_tokens')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', data.id)
    return data.access_token
  }

  // Refresh
  if (!data.refresh_token) return null

  const refreshed = await refreshToken(provider, data.refresh_token)
  if (!refreshed) {
    await supabase
      .from('oauth_tokens')
      .update({ last_error: 'refresh_failed', updated_at: new Date().toISOString() })
      .eq('id', data.id)
    return null
  }

  await supabase
    .from('oauth_tokens')
    .update({
      access_token:  refreshed.access_token,
      refresh_token: refreshed.refresh_token ?? data.refresh_token,
      expires_at:    refreshed.expires_at,
      last_error:    null,
      last_used_at:  new Date().toISOString(),
      updated_at:    new Date().toISOString(),
    })
    .eq('id', data.id)

  return refreshed.access_token
}

// Refresh token générique (tous providers)
async function refreshToken(
  provider: OAuthProvider,
  refreshToken: string
): Promise<{ access_token: string; refresh_token?: string; expires_at: number } | null> {
  const cfg = OAUTH_CONFIG[provider]

  try {
    // Withings a une API différente
    if (provider === 'withings') {
      const params = new URLSearchParams({
        action:        'requesttoken',
        grant_type:    'refresh_token',
        client_id:     cfg.clientId,
        client_secret: cfg.clientSecret,
        refresh_token: refreshToken,
      })
      const res = await fetch(cfg.tokenUrl, {
        method:  'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body:    params,
      })
      const json = await res.json()
      if (json.status !== 0) return null
      return {
        access_token:  json.body.access_token,
        refresh_token: json.body.refresh_token,
        expires_at:    Math.floor(Date.now() / 1000) + json.body.expires_in,
      }
    }

    // Strava, Wahoo, Polar : standard OAuth2
    const params = new URLSearchParams({
      grant_type:    'refresh_token',
      refresh_token: refreshToken,
      client_id:     cfg.clientId,
      client_secret: cfg.clientSecret,
    })
    const res = await fetch(cfg.tokenUrl, {
      method:  'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body:    params,
    })
    if (!res.ok) return null
    const json = await res.json()
    return {
      access_token:  json.access_token,
      refresh_token: json.refresh_token,
      expires_at:    json.expires_at ?? Math.floor(Date.now() / 1000) + (json.expires_in ?? 3600),
    }
  } catch {
    return null
  }
}

// Déconnecte un provider
export async function revokeToken(
  userId: string,
  provider: OAuthProvider
): Promise<void> {
  const supabase = createServiceClient()
  await supabase
    .from('oauth_tokens')
    .delete()
    .eq('user_id', userId)
    .eq('provider', provider)
}

// Liste les providers connectés pour un user
export async function getConnectedProviders(userId: string): Promise<string[]> {
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('oauth_tokens')
    .select('provider')
    .eq('user_id', userId)
    .eq('is_active', true)
return (data ?? []).map((r: { provider: string }) => r.provider)
}
