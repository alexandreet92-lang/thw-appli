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
  const publicRoutes = ['/login', '/onboarding']
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

  // Connecté → vérifie onboarding uniquement
  const { data: profile } = await supabase
    .from('profiles')
    .select('onboarding_completed')
    .eq('id', user.id)
    .single()

  // Onboarding pas terminé → redirige
  if (profile && !profile.onboarding_completed && path !== '/onboarding') {
    return NextResponse.redirect(new URL('/onboarding', request.url))
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
