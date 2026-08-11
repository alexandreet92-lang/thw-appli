import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type') as 'recovery' | 'signup' | 'email' | null
  const next = searchParams.get('next') ?? '/'

  // App native (Capacitor) : on NE consomme PAS le code ici (le code PKCE doit
  // être échangé côté app avec son verifier). On renvoie une page qui rebondit
  // vers le lien custom scheme → l'app se rouvre et termine la connexion.
  if (searchParams.get('native') === '1' && code) {
    const scheme = `com.thehybridway.app://auth-callback?code=${encodeURIComponent(code)}`
    return new NextResponse(
      `<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"><meta http-equiv="refresh" content="0;url=${scheme}"><script>location.replace(${JSON.stringify(scheme)})</script></head><body style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;padding:48px 24px;text-align:center;color:#334">Connexion en cours…<br><br><a href="${scheme}" style="color:#06B6D4;font-weight:600">Revenir à l'app</a></body></html>`,
      { headers: { 'content-type': 'text/html; charset=utf-8' } }
    )
  }

  const supabase = await createClient()

  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({ token_hash, type })
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/auth?error=lien_invalide_ou_expire`)
}
