import { NextResponse } from 'next/server'
import type { EmailOtpType } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { safeNextPath } from '@/lib/auth/redirect'

// Redirige vers /auth en transportant la RAISON de l'échec, pour que la page
// d'auth l'affiche. Sans ça (ancien comportement : ?error=lien_invalide_ou_expire
// jamais lu par la page), le lien d'email échouait en SILENCE.
function fail(origin: string, code: string, description?: string | null) {
  const url = new URL('/auth', origin)
  url.searchParams.set('error', code)
  if (description) url.searchParams.set('error_description', description)
  return NextResponse.redirect(url)
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  const next = safeNextPath(searchParams.get('next'))

  // ── Erreur renvoyée par Supabase lui-même (lien expiré, déjà utilisé…) ──
  // GoTrue place ces paramètres soit en query (flux PKCE), soit dans le
  // FRAGMENT (#) du flux implicite — ce dernier n'atteint jamais le serveur,
  // il est traité côté client sur /auth/reset-password.
  const err = searchParams.get('error_code') || searchParams.get('error')
  if (err) return fail(origin, err, searchParams.get('error_description'))

  // App native (Capacitor) : on NE consomme PAS le jeton ici (le code PKCE doit
  // être échangé côté app avec son verifier). On renvoie une page qui rebondit
  // vers le lien custom scheme → l'app se rouvre et termine la connexion.
  if (searchParams.get('native') === '1' && (code || token_hash)) {
    const params = new URLSearchParams()
    if (code) params.set('code', code)
    if (token_hash) params.set('token_hash', token_hash)
    if (type) params.set('type', type)
    params.set('next', next)
    const scheme = `com.thehybridway.app://auth-callback?${params.toString()}`
    return new NextResponse(
      `<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"><meta http-equiv="refresh" content="0;url=${scheme}"><script>location.replace(${JSON.stringify(scheme)})</script></head><body style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;padding:48px 24px;text-align:center;color:#334">Connexion en cours…<br><br><a href="${scheme}" style="color:#06B6D4;font-weight:600">Revenir à l'app</a></body></html>`,
      { headers: { 'content-type': 'text/html; charset=utf-8' } }
    )
  }

  const supabase = await createClient()

  // Flux « token_hash » (templates d'email utilisant {{ .TokenHash }}) :
  // fonctionne depuis N'IMPORTE QUEL appareil, contrairement au flux PKCE qui
  // exige que le lien soit ouvert dans le navigateur d'origine.
  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({ token_hash, type })
    if (!error) return NextResponse.redirect(new URL(next, origin))
    return fail(origin, 'otp_expired', error.message)
  }

  // Flux PKCE : le code_verifier a été déposé en cookie par le client qui a
  // demandé le lien. S'il manque (email ouvert sur un AUTRE appareil), l'échange
  // échoue — on le dit explicitement plutôt que d'afficher un message générique.
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) return NextResponse.redirect(new URL(next, origin))
    return fail(origin, 'pkce_exchange_failed', error.message)
  }

  return fail(origin, 'missing_token')
}
