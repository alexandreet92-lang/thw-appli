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
  const publicRoutes = ['/login', '/onboarding', '/access-expired']
  if (publicRoutes.some(r => path.startsWith(r))) {
    // Si déjà connecté et va sur /login → redirige vers home
    if (path === '/login' && user) {
      return NextResponse.redirect(new URL('/', request.url))
    }
    return response
  }

  // Routes API — jamais bloquées
  if (path.startsWith('/api')) return response

  // Pas connecté → login
  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url))
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

  // Vérifier onboarding uniquement si accès autorisé
  const { data: profile } = await supabase
    .from('profiles')
    .select('onboarding_completed')
    .eq('id', user.id)
    .single()

  if (profile && !profile.onboarding_completed && path !== '/onboarding') {
    return NextResponse.redirect(new URL('/onboarding', request.url))
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
