export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { verifyState, exchangeCode, getUserEmail, syncUser } from '@/lib/agenda/google'

// Retour OAuth Google : échange le code, stocke les tokens, lance une 1re sync.
export async function GET(req: NextRequest) {
  const origin = req.nextUrl.origin
  const code = req.nextUrl.searchParams.get('code')
  const state = req.nextUrl.searchParams.get('state')
  const userId = state ? verifyState(state) : null
  if (!code || !userId) return NextResponse.redirect(new URL('/planning-week?google=error', origin))

  try {
    const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${origin}/api/agenda/google/callback`
    const tok = await exchangeCode(code, redirectUri)
    const email = await getUserEmail(tok.access_token)
    const sb = createServiceClient()
    await sb.from('google_calendar_connections').upsert({
      user_id: userId, google_email: email,
      access_token: tok.access_token, refresh_token: tok.refresh_token ?? null,
      token_expiry: new Date(Date.now() + tok.expires_in * 1000).toISOString(),
      connected_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })
    // Première synchronisation (best-effort, non bloquante pour la redirection).
    try { await syncUser(sb, userId) } catch { /* best-effort */ }
    return NextResponse.redirect(new URL('/planning-week?google=connected', origin))
  } catch (err) {
    console.error('[google-callback]', err)
    return NextResponse.redirect(new URL('/planning-week?google=error', origin))
  }
}
