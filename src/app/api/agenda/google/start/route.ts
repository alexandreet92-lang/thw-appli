export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { googleConfigured, signState, authUrl } from '@/lib/agenda/google'

// Démarre l'OAuth Google Agenda pour l'utilisateur connecté.
export async function GET(req: NextRequest) {
  const origin = req.nextUrl.origin
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.redirect(new URL('/auth', origin))
  if (!googleConfigured()) return NextResponse.redirect(new URL('/planning-week?google=unavailable', origin))

  const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${origin}/api/agenda/google/callback`
  return NextResponse.redirect(authUrl(redirectUri, signState(user.id)))
}
