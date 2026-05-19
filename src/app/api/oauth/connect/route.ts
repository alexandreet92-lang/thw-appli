import { NextRequest, NextResponse } from 'next/server'
import { buildAuthUrl, OAuthProvider, OAUTH_CONFIG } from '@/lib/oauth/config'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

export async function GET(req: NextRequest) {
  const provider = req.nextUrl.searchParams.get('provider') as OAuthProvider

  if (!provider || !OAUTH_CONFIG[provider]) {
    return NextResponse.json({ error: 'Invalid provider' }, { status: 400 })
  }

  // Vérifie que l'user est connecté
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Génère un state anti-CSRF
  const state = crypto.randomUUID()
  const cookieStore = await cookies()
  cookieStore.set(`oauth_state_${provider}`, state, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    maxAge:   600,
    path:     '/',
  })

  // ── DEBUG ──────────────────────────────────────────────────────
  const cfg = OAUTH_CONFIG[provider]
  console.log(`[oauth/connect] provider=${provider}`)
  console.log(`[oauth/connect] clientId exists: ${!!cfg.clientId} (len=${cfg.clientId.length})`)
  console.log(`[oauth/connect] clientSecret exists: ${!!cfg.clientSecret}`)
  console.log(`[oauth/connect] redirectUri: "${cfg.redirectUri}"`)
  console.log(`[oauth/connect] scope: "${cfg.scope}"`)
  const authUrl = buildAuthUrl(provider, state)
  console.log(`[oauth/connect] authUrl: ${authUrl}`)
  // ──────────────────────────────────────────────────────────────

  return NextResponse.redirect(authUrl)
}
