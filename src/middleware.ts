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

  // Routes publiques — toujours accessibles
  const publicRoutes = ['/login', '/onboarding', '/select-plan']
  if (publicRoutes.some(r => path.startsWith(r))) {
    // Si déjà connecté et va sur /login → redirige
    if (path === '/login' && user) {
      return NextResponse.redirect(new URL('/profile', request.url))
    }
    return response
  }

  // Routes API — jamais bloquées
  if (path.startsWith('/api')) return response

  // Pas connecté → login
  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Connecté → vérifie onboarding et trial
  const { data: profile } = await supabase
    .from('profiles')
    .select('onboarding_completed, trial_ends_at, plan')
    .eq('id', user.id)
    .single()

  // Onboarding pas terminé
  if (profile && !profile.onboarding_completed && path !== '/onboarding') {
    return NextResponse.redirect(new URL('/onboarding', request.url))
  }

  // Trial expiré et pas d'abonnement actif
  if (profile && profile.onboarding_completed) {
    const trialExpired = profile.trial_ends_at
      ? new Date(profile.trial_ends_at) < new Date()
      : false
    const hasPlan = profile.plan && profile.plan !== 'trial'

    if (trialExpired && !hasPlan && path !== '/select-plan') {
      return NextResponse.redirect(new URL('/select-plan', request.url))
    }
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
