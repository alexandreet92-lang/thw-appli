import { NextResponse } from 'next/server'
import { buildAuthUrl } from '@/lib/strava/config'
import { cookies } from 'next/headers'

// GET /api/auth/strava/connect
// Redirige vers la page d'autorisation Strava avec un state CSRF
export async function GET() {
  const state = Math.random().toString(36).slice(2)
  const cookieStore = await cookies()

  cookieStore.set('strava_oauth_state', state, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    maxAge:   600, // 10 minutes
    path:     '/',
    sameSite: 'lax',
  })

  return NextResponse.redirect(buildAuthUrl(state))
}
