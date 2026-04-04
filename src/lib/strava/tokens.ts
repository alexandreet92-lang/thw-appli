import { createServiceClient } from '@/lib/supabase/server'
import { STRAVA_CONFIG } from './config'

export interface StravaToken {
  access_token:  string
  refresh_token: string
  expires_at:    number
  athlete_id:    number
}

// Récupère un token valide — refresh automatique si expiré
export async function getValidToken(userId: string): Promise<StravaToken | null> {
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('strava_tokens')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (!data) return null

  const now = Math.floor(Date.now() / 1000)

  // Token encore valide (marge de 5 min)
  if (data.expires_at > now + 300) {
    return {
      access_token:  data.access_token,
      refresh_token: data.refresh_token,
      expires_at:    data.expires_at,
      athlete_id:    data.athlete_id,
    }
  }

  // Refresh token expiré
  const res = await fetch(STRAVA_CONFIG.tokenUrl, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({
      client_id:     STRAVA_CONFIG.clientId,
      client_secret: STRAVA_CONFIG.clientSecret,
      grant_type:    'refresh_token',
      refresh_token: data.refresh_token,
    }),
  })
  if (!res.ok) return null

  const refreshed = await res.json()

  await supabase
    .from('strava_tokens')
    .update({
      access_token:  refreshed.access_token,
      refresh_token: refreshed.refresh_token,
      expires_at:    refreshed.expires_at,
      updated_at:    new Date().toISOString(),
    })
    .eq('user_id', userId)

  return {
    access_token:  refreshed.access_token,
    refresh_token: refreshed.refresh_token,
    expires_at:    refreshed.expires_at,
    athlete_id:    data.athlete_id,
  }
}

// Sauvegarde les tokens après l'OAuth callback
export async function saveTokens(
  userId: string,
  t: {
    access_token:  string
    refresh_token: string
    expires_at:    number
    athlete_id:    number
    scope:         string
    athlete:       Record<string, unknown>
  }
) {
  const supabase = createServiceClient()
  const { error } = await supabase.from('strava_tokens').upsert(
    {
      user_id:       userId,
      athlete_id:    t.athlete_id,
      access_token:  t.access_token,
      refresh_token: t.refresh_token,
      expires_at:    t.expires_at,
      scope:         t.scope,
      athlete_data:  t.athlete,
      updated_at:    new Date().toISOString(),
    },
    { onConflict: 'user_id' }
  )
  if (error) throw new Error(error.message)
}

// Supprime les tokens (déconnexion)
export async function disconnectStrava(userId: string) {
  const supabase = createServiceClient()
  await supabase.from('strava_tokens').delete().eq('user_id', userId)
}

// Vérifie si un user est connecté à Strava
export async function isStravaConnected(userId: string): Promise<boolean> {
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('strava_tokens')
    .select('id')
    .eq('user_id', userId)
    .single()
  return !!data
}
