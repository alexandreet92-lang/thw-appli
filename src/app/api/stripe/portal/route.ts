// ══════════════════════════════════════════════════════════════
// POST /api/stripe/portal
// Crée une Stripe Billing Portal Session pour gérer l'abonnement.
// Body   : { return_path?: string } (optionnel — chemin interne de retour)
// Return : { url: string }
// ══════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { stripe } from '@/lib/stripe/config'

export async function POST(req: NextRequest) {
  // ── Auth ─────────────────────────────────────────────────────
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  // ── Récupère le customer ID ───────────────────────────────────
  // Abonnement athlète (user_subscriptions) OU pack coach (coach_subscriptions,
  // souscrit via Payment Link — le customer y est posé par le webhook).
  const sb = createServiceClient()
  const { data: sub } = await sb
    .from('user_subscriptions')
    .select('stripe_customer_id')
    .eq('user_id', user.id)
    .maybeSingle()

  let customerId = sub?.stripe_customer_id ?? null
  if (!customerId) {
    const { data: coachSub } = await sb
      .from('coach_subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .maybeSingle()
    customerId = coachSub?.stripe_customer_id ?? null
  }

  if (!customerId) {
    return NextResponse.json(
      { error: 'Aucun abonnement Stripe trouvé pour cet utilisateur' },
      { status: 404 },
    )
  }

  // ── Billing Portal Session ────────────────────────────────────
  // Origine http(s) uniquement : depuis l'app iOS, l'en-tête Origin vaut
  // « capacitor://localhost » (refusé comme return_url) → URL du site.
  const rawOrigin = req.headers.get('origin')
  const origin = (rawOrigin && /^https?:\/\//.test(rawOrigin) ? rawOrigin : null)
    ?? process.env.NEXT_PUBLIC_APP_URL
    ?? 'https://thw-coaching.vercel.app'

  // Chemin de retour interne sûr (pas d'URL absolue ni « // » → pas d'open redirect).
  let returnPath = '/settings/subscription'
  try {
    const body = await req.json() as { return_path?: unknown }
    const p = body.return_path
    if (typeof p === 'string' && p.startsWith('/') && !p.startsWith('//')) returnPath = p
  } catch { /* corps vide : défaut */ }

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer:   customerId,
      return_url: `${origin}${returnPath}`,
    })
    return NextResponse.json({ url: session.url })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[portal] stripe error:', msg)

    // Customer introuvable (ex : customer Live utilisé en mode Test)
    // On nettoie l'ID obsolète afin que le prochain checkout en crée un nouveau.
    if (msg.includes('No such customer')) {
      await sb.from('user_subscriptions').update({ stripe_customer_id: null }).eq('user_id', user.id)
      await sb.from('coach_subscriptions').update({ stripe_customer_id: null }).eq('user_id', user.id)

      return NextResponse.json(
        { error: 'Aucun abonnement actif trouvé. Veuillez souscrire un abonnement pour accéder au portail.' },
        { status: 404 },
      )
    }

    return NextResponse.json({ error: `Erreur Stripe : ${msg}` }, { status: 500 })
  }
}
