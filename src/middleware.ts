import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { COACH_OWNER_ID, COACH_TRIAL_DAYS } from '@/lib/coach/owner'

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

  // Perf : getSession() lit le cookie signé LOCALEMENT (rafraîchit si expiré),
  // au lieu de getUser() qui fait un aller-retour RÉSEAU au serveur d'auth à
  // CHAQUE navigation. Ici on ne fait que du gating de routes ; l'accès aux
  // données reste protégé par la RLS (contexte auth réel). → navigation bien plus fluide.
  const { data: { session } } = await supabase.auth.getSession()
  const user = session?.user ?? null
  const path = request.nextUrl.pathname

  // Racine — la page gère elle-même la session et le redirect
  if (path === '/') return response

  // Routes publiques — toujours accessibles
  // '/c' = vitrines coach publiques (liens partageables, accessibles sans compte).
  // '/coach/tarifs' = page publique de tarification des packs coach (sans compte).
  // '/programmes' = catalogue public des programmes coach (accessible à tous).
  const publicRoutes = ['/login', '/auth', '/onboarding', '/access-expired', '/legal', '/decouvrir', '/c/', '/coach/tarifs', '/programmes']
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

  // Abonnement athlète + profil chargés ENSEMBLE : on doit connaître l'accès coach
  // AVANT de bloquer sur un abonnement athlète expiré, sinon un coach valide (essai
  // ou pack) dont l'essai ATHLÈTE a expiré serait éjecté de toute l'app vers
  // /access-expired. Bug corrigé : l'entitlement coach lève le blocage athlète.
  const [{ data: subscription }, { data: profile }] = await Promise.all([
    supabase.from('user_subscriptions').select('status').eq('user_id', user.id).single(),
    supabase.from('profiles').select('profile_setup_done, coach_subscribed, coach_trial_started_at').eq('id', user.id).single(),
  ])

  const startedIso = profile?.coach_trial_started_at as string | null | undefined
  const coachTrialActive = !!startedIso && Date.now() - new Date(startedIso).getTime() < COACH_TRIAL_DAYS * 86400000
  const coachEntitled = user.id === COACH_OWNER_ID || profile?.coach_subscribed === true || coachTrialActive

  const blockedStatuses = ['trial_expired', 'cancelled', 'canceled']
  // Un coach entitled n'est jamais bloqué par un abonnement athlète expiré.
  if (!coachEntitled && subscription && blockedStatuses.includes(subscription.status)) {
    return NextResponse.redirect(new URL('/access-expired', request.url))
  }

  // Mini-questionnaire one-shot : tant que le profil n'est pas configuré, on
  // redirige vers /bienvenue (l'écran d'abonnement /onboarding viendra plus tard).
  if (profile && !profile.profile_setup_done && path !== '/bienvenue') {
    return NextResponse.redirect(new URL('/bienvenue', request.url))
  }

  // ── Garde de l'espace coach ────────────────────────────────────
  // Toutes les routes /coach/* SAUF /coach/subscription (point d'entrée pour
  // s'abonner) et /coach/tarifs (publique) exigent un accès coach : owner,
  // pack payant (coach_subscribed, posé par le webhook — vrai aussi en essai
  // Stripe « trialing »), ou essai coach applicatif de 14 j. Sinon → page d'abo.
  // (La RLS bloque déjà les DONNÉES ; ceci évite d'afficher un espace coach vide.)
  if (path.startsWith('/coach') && !path.startsWith('/coach/subscription') && !coachEntitled) {
    return NextResponse.redirect(new URL('/coach/subscription', request.url))
  }

  return response
}

export const config = {
  // Exclut les assets publics (dont /branding/*) : sinon les requêtes d'images
  // sans cookie (ex. clients mail) sont redirigées vers /auth (307) → image cassée.
  matcher: ['/((?!_next/static|_next/image|favicon.ico|branding|logos|logo.png|decouvrir).*)'],
}
