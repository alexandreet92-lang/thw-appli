export const STRAVA_CONFIG = {
  clientId:     process.env.STRAVA_CLIENT_ID!,
  clientSecret: process.env.STRAVA_CLIENT_SECRET!,
  redirectUri:  process.env.STRAVA_REDIRECT_URI!,
  authUrl:      'https://www.strava.com/oauth/authorize',
  tokenUrl:     'https://www.strava.com/oauth/token',
  apiBase:      'https://www.strava.com/api/v3',
  scope:        'read,activity:read_all,profile:read_all',
} as const

export function buildAuthUrl(state?: string): string {
  const params = new URLSearchParams({
    client_id:       STRAVA_CONFIG.clientId,
    redirect_uri:    STRAVA_CONFIG.redirectUri,
    response_type:   'code',
    approval_prompt: 'auto',
    scope:           STRAVA_CONFIG.scope,
    ...(state ? { state } : {}),
  })
  return `${STRAVA_CONFIG.authUrl}?${params}`
}
