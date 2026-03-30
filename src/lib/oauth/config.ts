export type OAuthProvider = 'strava' | 'wahoo' | 'polar' | 'withings'

export interface ProviderConfig {
  clientId:     string
  clientSecret: string
  redirectUri:  string
  authUrl:      string
  tokenUrl:     string
  scope:        string
}

export const OAUTH_CONFIG: Record<OAuthProvider, ProviderConfig> = {
  strava: {
    clientId:     process.env.STRAVA_CLIENT_ID     ?? '',
    clientSecret: process.env.STRAVA_CLIENT_SECRET ?? '',
    redirectUri:  process.env.STRAVA_REDIRECT_URI  ?? '',
    authUrl:      'https://www.strava.com/oauth/authorize',
    tokenUrl:     'https://www.strava.com/oauth/token',
    scope:        'read,activity:read_all,profile:read_all',
  },
  wahoo: {
    clientId:     process.env.WAHOO_CLIENT_ID     ?? '',
    clientSecret: process.env.WAHOO_CLIENT_SECRET ?? '',
    redirectUri:  process.env.WAHOO_REDIRECT_URI  ?? '',
    authUrl:      'https://api.wahooligan.com/oauth/authorize',
    tokenUrl:     'https://api.wahooligan.com/oauth/token',
    scope:        'user_read workouts_read',
  },
  polar: {
    clientId:     process.env.POLAR_CLIENT_ID     ?? '',
    clientSecret: process.env.POLAR_CLIENT_SECRET ?? '',
    redirectUri:  process.env.POLAR_REDIRECT_URI  ?? '',
    authUrl:      'https://flow.polar.com/oauth2/authorization',
    tokenUrl:     'https://polarremote.com/v2/oauth2/token',
    scope:        'accesslink.read_all',
  },
  withings: {
    clientId:     process.env.WITHINGS_CLIENT_ID     ?? '',
    clientSecret: process.env.WITHINGS_CLIENT_SECRET ?? '',
    redirectUri:  process.env.WITHINGS_REDIRECT_URI  ?? '',
    authUrl:      'https://account.withings.com/oauth2_user/authorize2',
    tokenUrl:     'https://wbsapi.withings.net/v2/oauth2',
    scope:        'user.info,user.metrics,user.activity',
  },
}

export function buildAuthUrl(provider: OAuthProvider, state: string): string {
  const cfg = OAUTH_CONFIG[provider]
  const params = new URLSearchParams({
    client_id:       cfg.clientId,
    redirect_uri:    cfg.redirectUri,
    response_type:   'code',
    scope:           cfg.scope,
    state:           `${provider}:${state}`,
    approval_prompt: 'auto',
  })
  return `${cfg.authUrl}?${params}`
}
