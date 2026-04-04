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

  return NextResponse.redirect(buildAuthUrl(provider, state))
}
