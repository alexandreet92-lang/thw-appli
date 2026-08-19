import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { COACH_OWNER_ID, COACH_TRIAL_DAYS } from '@/lib/coach/owner'

// ══════════════════════════════════════════════════════════════════
// Middleware de gating. RÈGLE D'OR : il ne doit JAMAIS faire attendre une
// requête assez longtemps pour que Vercel le tue (504 MIDDLEWARE_INVOCATION_
// TIMEOUT, vu quand Supabase répond lentement). Chaque accès DB est donc borné
// par un délai dur ; en cas de lenteur on « fail-open » (on laisse passer), car
// la RLS protège déjà les DONNÉES — le gating n'est qu'un confort d'UX.
// ══════════════════════════════════════════════════════════════════

const TIMED_OUT = Symbol('timeout')

// Race une promesse contre un délai. Renvoie `fallback` si le délai expire OU si
// la promesse rejette. La requête réelle qui perd la course est simplement
// abandonnée (sans effet de bord bloquant).
function withTimeout<T, F>(p: PromiseLike<T>, ms: number, fallback: F): Promise<T | F> {
  return Promise.race([
    Promise.resolve(p).catch(() => fallback),
    new Promise<F>(res => setTimeout(() => res(fallback), ms)),
  ])
}

export async function middleware(request: NextRequest) {
  const response = NextResponse.next({ request })
  const path = request.nextUrl.pathname

  // ── Sorties rapides SANS accès DB (jamais de 504 sur ces routes) ──
  // Racine : la page gère elle-même la session/redirect.
  if (path === '/') return response
  // Routes publiques (vitrines /c, tarifs coach, programmes, auth…).
  const publicRoutes = ['/login', '/auth', '/onboarding', '/access-expired', '/legal', '/decouvrir', '/c/', '/coach/tarifs', '/programmes']
  if (publicRoutes.some(r => path.startsWith(r))) return response
  // Routes API — jamais bloquées.
  if (path.startsWith('/api')) return response

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

  // getSession() lit le cookie signé LOCALEMENT (peut rafraîchir le token via
  // réseau si expiré) → borné. Si ça traîne, on laisse passer (fail-open).
  const sess = await withTimeout(supabase.auth.getSession().then(r => r.data.session), 1500, TIMED_OUT)
  if (sess === TIMED_OUT) return response
  const user = sess?.user ?? null

  // Pas connecté → auth.
  if (!user) return NextResponse.redirect(new URL('/auth', request.url))

  // ── Présence : last_seen_at. Throttlé à 5 MIN (au lieu de 60 s) et en
  // FIRE-AND-FORGET (jamais attendu) pour NE PAS ajouter d'écriture DB dans le
  // chemin critique de chaque navigation — c'était un contributeur majeur à la
  // saturation de la base. On pose d'abord le cookie (throttle effectif même si
  // l'écriture est abandonnée), puis on lance l'update sans l'attendre. ──
  const lastPing = request.cookies.get('thw_ls')?.value
  if (!lastPing || Date.now() - Number(lastPing) > 300_000) {
    response.cookies.set('thw_ls', String(Date.now()), { httpOnly: true, sameSite: 'lax', maxAge: 360, path: '/' })
    void withTimeout(
      Promise.resolve(supabase.from('profiles').update({ last_seen_at: new Date().toISOString() }).eq('id', user.id)),
      500, null,
    )
  }

  // ── Cockpit admin (/admin) : refus RÉEL (403) pour tout autre que l'admin ──
  if (path === '/admin') {
    const admin = process.env.ADMIN_EMAIL
    if (!admin || (user.email ?? '').toLowerCase() !== admin.toLowerCase()) {
      return new NextResponse('Forbidden', { status: 403 })
    }
    return response
  }

  // ── Lectures de gating (abonnement + profil), bornées. Sur lenteur/erreur →
  // fail-open : on laisse passer, la page et la RLS prennent le relais. ──
  const gate = await withTimeout(
    Promise.all([
      supabase.from('user_subscriptions').select('status').eq('user_id', user.id).single(),
      supabase.from('profiles').select('profile_setup_done, coach_subscribed, coach_trial_started_at').eq('id', user.id).single(),
    ]),
    1500, TIMED_OUT,
  )
  if (gate === TIMED_OUT) return response

  const [{ data: subscription }, { data: profile }] = gate

  const startedIso = profile?.coach_trial_started_at as string | null | undefined
  const coachTrialActive = !!startedIso && Date.now() - new Date(startedIso).getTime() < COACH_TRIAL_DAYS * 86400000
  const coachEntitled = user.id === COACH_OWNER_ID || profile?.coach_subscribed === true || coachTrialActive

  const blockedStatuses = ['trial_expired', 'cancelled', 'canceled']
  // Un coach entitled n'est jamais bloqué par un abonnement athlète expiré.
  if (!coachEntitled && subscription && blockedStatuses.includes(subscription.status)) {
    return NextResponse.redirect(new URL('/access-expired', request.url))
  }

  // Mini-questionnaire one-shot : tant que le profil n'est pas configuré → /bienvenue.
  if (profile && !profile.profile_setup_done && path !== '/bienvenue') {
    return NextResponse.redirect(new URL('/bienvenue', request.url))
  }

  // ── Garde de l'espace coach (owner / pack / essai 14 j). RLS protège les
  // données ; ceci évite un espace coach vide. ──
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
