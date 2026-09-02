// GET /api/auth/site-oauth?provider=google|apple&next=/site/compte.html
// Connexion OAuth DEPUIS LE SITE : on redirige directement vers le fournisseur
// (Google/Apple), en RESTANT sur le domaine web — sans jamais charger la page
// /auth de l'app (qui, ouverte dans le navigateur in-app, rouvrait l'app).
// Le cookie PKCE (code_verifier) est posé ici ; /auth/callback échange le code
// puis renvoie sur `next`.
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const { searchParams, origin } = new URL(req.url)
  const provider = searchParams.get('provider')
  const nextRaw = searchParams.get('next') || '/site/compte.html'
  const next = nextRaw.startsWith('/') && !nextRaw.startsWith('//') ? nextRaw : '/site/compte.html'
  const backToLogin = () => NextResponse.redirect(`${origin}/site/compte.html`)

  if (provider !== 'google' && provider !== 'apple') return backToLogin()

  try {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}` },
    })
    if (error || !data?.url) return backToLogin()
    return NextResponse.redirect(data.url)
  } catch {
    return backToLogin()
  }
}
