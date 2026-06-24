import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) => {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value)
            response.cookies.set(name, value, options as Parameters<typeof response.cookies.set>[2])
          })
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const path = request.nextUrl.pathname

  // Racine — la page gère elle-même la session et le redirect
  if (path === '/') return response

  // Routes publiques — toujours accessibles
  const publicRoutes = ['/login', '/auth', '/onboarding', '/access-expired', '/legal', '/decouvrir']
  if (publicRoutes.some(r => path.startsWith(r))) return response

  // Routes API — jamais bloquées
  if (path.startsWith('/api')) return response

  // Pas connecté → auth
  if (!user) {
    return NextResponse.redirect(new URL('/auth', request.url))
  }

  // ── Présence : last_seen_at, throttlé à 60 s via cookie (pas de heartbeat client) ──
  const lastPing = request.cookies.get('thw_ls')?.value
  if (!lastPing || Date.now() - Number(lastPing) > 60_000) {
    await supabase.from('profiles').update({ last_seen_at: new Date().toISOString() }).eq('id', user.id)
    response.cookies.set('thw_ls', String(Date.now()), { httpOnly: true, sameSite: 'lax', maxAge: 120, path: '/' })
  }

  // ── Cockpit admin (/admin) : refus RÉEL (403) pour tout autre que l'admin ──
  if (path === '/admin') {
    const admin = process.env.ADMIN_EMAIL
    if (!admin || (user.email ?? '').toLowerCase() !== admin.toLowerCase()) {
      return new NextResponse('Forbidden', { status: 403 })
    }
    // Admin authentifié : on saute les contrôles abonnement/onboarding ci-dessous.
    return response
  }

  // Vérifier le statut de l'abonnement
  const { data: subscription } = await supabase
    .from('user_subscriptions')
    .select('status')
    .eq('user_id', user.id)
    .single()

  const blockedStatuses = ['trial_expired', 'cancelled', 'canceled']
  if (subscription && blockedStatuses.includes(subscription.status)) {
    return NextResponse.redirect(new URL('/access-expired', request.url))
  }

  // Mini-questionnaire one-shot : tant que le profil n'est pas configuré, on
  // redirige vers /bienvenue (l'écran d'abonnement /onboarding viendra plus tard).
  const { data: profile } = await supabase
    .from('profiles')
    .select('profile_setup_done')
    .eq('id', user.id)
    .single()

  if (profile && !profile.profile_setup_done && path !== '/bienvenue') {
    return NextResponse.redirect(new URL('/bienvenue', request.url))
  }

  return response
}

export const config = {
  // Exclut les assets publics (dont /branding/*) : sinon les requêtes d'images
  // sans cookie (ex. clients mail) sont redirigées vers /auth (307) → image cassée.
  matcher: ['/((?!_next/static|_next/image|favicon.ico|branding|logos|logo.png|decouvrir).*)'],
}
