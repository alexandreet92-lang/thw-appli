// ══════════════════════════════════════════════════════════════
// POST /api/stripe/checkout
// Crée une Stripe Checkout Session pour un tier + période donnés.
// Body  : { tier: TierName, billingPeriod: 'monthly' | 'yearly' }
// Return: { url: string }
//      ou { updated: true, tier } — abonné Stripe actif qui change de
//         formule : l'abonnement EXISTANT est modifié (prorata), pas de
//         second abonnement.
// 409    : abonnement App Store actif (à gérer chez Apple) ou formule
//          identique déjà active.
// ══════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { stripe, getPriceId } from '@/lib/stripe/config'
import type { TierName } from '@/lib/subscriptions/tier-limits'
import { getCoachPack, buildCoachPackCheckoutUrl, type CoachPackKey, type CoachTier } from '@/lib/subscriptions/coach-packs'

const VALID_TIERS: TierName[] = ['premium', 'pro', 'expert']
const VALID_PERIODS = ['monthly', 'yearly'] as const
type BillingPeriod = (typeof VALID_PERIODS)[number]

export async function POST(req: NextRequest) {

  // ── Diagnostics ───────────────────────────────────────────────
  console.log('[checkout] STRIPE_SECRET_KEY present:', !!process.env.STRIPE_SECRET_KEY)

  // ── Auth ─────────────────────────────────────────────────────
  let userId: string
  let userEmail: string | undefined
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    userId    = user.id
    userEmail = user.email ?? undefined
  } catch (err) {
    console.error('[checkout] auth error:', err)
    return NextResponse.json({ error: 'Erreur d\'authentification' }, { status: 401 })
  }

  // ── Validation body ───────────────────────────────────────────
  // Deux formes : abonnement athlète { tier } OU pack coach { coachPack }.
  let priceId: string | undefined
  let checkoutMeta: Record<string, string>

  try {
    const body = await req.json() as { tier?: unknown; coachPack?: unknown; coachTier?: unknown; billingPeriod?: unknown }
    if (!VALID_PERIODS.includes(body.billingPeriod as BillingPeriod)) {
      return NextResponse.json({ error: `billingPeriod invalide : ${String(body.billingPeriod)}` }, { status: 400 })
    }
    const billingPeriod = body.billingPeriod as BillingPeriod

    // ── Pack coach → Payment Link Stripe hébergé ────────────────
    // On NE crée PAS de Checkout Session : on renvoie directement l'URL du
    // Payment Link, avec l'identité du coach en client_reference_id. Le pack
    // et la période sont re-dérivés côté webhook à partir du MONTANT payé
    // (le lien fixe le prix), jamais depuis l'URL — impossible de payer un
    // petit pack et d'en réclamer un gros.
    if (body.coachPack) {
      const pack = getCoachPack(body.coachPack as string)
      if (!pack) return NextResponse.json({ error: `Pack coach invalide : ${String(body.coachPack)}` }, { status: 400 })
      // Formule athlète incluse (Premium par défaut, la formule de base).
      const coachTier: CoachTier = body.coachTier === 'expert' ? 'expert' : body.coachTier === 'pro' ? 'pro' : 'premium'
      const url = buildCoachPackCheckoutUrl(pack.key as CoachPackKey, coachTier, billingPeriod, userId, userEmail)
      if (!url) return NextResponse.json({ error: `Lien de paiement indisponible pour ${pack.key} (${billingPeriod}).` }, { status: 500 })
      console.log('[checkout] coach pack payment link:', pack.key, billingPeriod)
      return NextResponse.json({ url })
    }

    if (!VALID_TIERS.includes(body.tier as TierName)) {
      return NextResponse.json({ error: `Tier invalide : ${String(body.tier)}` }, { status: 400 })
    }
    const tier = body.tier as TierName
    priceId = getPriceId(tier, billingPeriod)
    checkoutMeta = { userId, tier }
    if (!priceId) return NextResponse.json({ error: `Price ID non configuré : STRIPE_PRICE_${tier.toUpperCase()}_${billingPeriod.toUpperCase()} manquant` }, { status: 500 })
  } catch (err) {
    console.error('[checkout] body parse error:', err)
    return NextResponse.json({ error: 'Corps de requête JSON invalide' }, { status: 400 })
  }

  // ── Changement de formule pour un abonné existant ─────────────
  // Un nouveau Checkout créerait un SECOND abonnement facturé en parallèle :
  // on modifie le prix de l'abonnement Stripe actif (prorata). Le webhook
  // customer.subscription.updated confirme ensuite le tier.
  try {
    const sb = createServiceClient()
    const { data: cur } = await sb
      .from('user_subscriptions')
      .select('store, status, stripe_subscription_id')
      .eq('user_id', userId)
      .maybeSingle()
    const live = cur?.status === 'active' || cur?.status === 'trialing' || cur?.status === 'past_due'
    // Stripe fait foi en premier : un ancien achat Apple expiré peut laisser
    // store = 'app_store' sur une ligne désormais payée via Stripe.
    if (cur?.stripe_subscription_id && live) {
      let existing: Awaited<ReturnType<typeof stripe.subscriptions.retrieve>> | null = null
      try { existing = await stripe.subscriptions.retrieve(cur.stripe_subscription_id) } catch { existing = null }
      const item = existing?.items.data[0]
      if (existing && item && (existing.status === 'active' || existing.status === 'trialing' || existing.status === 'past_due')) {
        if (item.price.id === priceId) {
          return NextResponse.json({ error: 'same_plan' }, { status: 409 })
        }
        await stripe.subscriptions.update(existing.id, {
          items: [{ id: item.id, price: priceId }],
          proration_behavior: 'create_prorations',
          cancel_at_period_end: false,
          metadata: checkoutMeta,
        })
        await sb.from('user_subscriptions')
          .update({ tier: checkoutMeta.tier, cancel_at_period_end: false })
          .eq('user_id', userId)
        console.log('[checkout] plan switched in place:', existing.id, '→', checkoutMeta.tier)
        return NextResponse.json({ updated: true, tier: checkoutMeta.tier })
      }
      // Abonnement introuvable / terminé côté Stripe → nouveau Checkout ci-dessous.
    }
    // Abonnement Apple actif : il se change / résilie chez Apple (pas de
    // second abonnement Stripe en parallèle).
    if (cur?.store === 'app_store' && live) {
      return NextResponse.json({ error: 'app_store_managed' }, { status: 409 })
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[checkout] plan switch error:', msg)
    return NextResponse.json({ error: `Erreur Stripe : ${msg}` }, { status: 500 })
  }

  // ── Customer Stripe (récupère ou crée) ────────────────────────
  let customerId: string
  try {
    const sb = createServiceClient()
    const { data: sub } = await sb
      .from('user_subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', userId)
      .single()

    const existing = sub?.stripe_customer_id ?? null

    if (existing) {
      // Vérifie que le customer existe dans le mode Stripe actuel (Live vs Test).
      // Un customer créé en Live n'existe pas en Test, et vice-versa.
      try {
        await stripe.customers.retrieve(existing)
        customerId = existing
        console.log('[checkout] existing customer verified:', existing)
      } catch (retrieveErr) {
        const retrieveMsg = retrieveErr instanceof Error ? retrieveErr.message : String(retrieveErr)
        console.warn('[checkout] stale customer ID, creating fresh one. Reason:', retrieveMsg)

        // Customer introuvable dans ce mode → on en crée un nouveau
        const freshCustomer = await stripe.customers.create({
          email:    userEmail,
          metadata: { userId },
        })
        customerId = freshCustomer.id

        // Met à jour la ligne user_subscriptions avec le nouveau customer ID.
        // Statut 'incomplete' : la ligne ne donne AUCUN droit tant que le webhook
        // n'a pas confirmé le paiement (il posera status='active' + subscription_id).
        // Un checkout abandonné ne doit jamais accorder Premium gratuit.
        await sb.from('user_subscriptions').upsert(
          { user_id: userId, stripe_customer_id: customerId, status: 'incomplete' },
          { onConflict: 'user_id' },
        )
        console.log('[checkout] fresh customer created:', customerId)
      }
    } else {
      const customer = await stripe.customers.create({
        email:    userEmail,
        metadata: { userId },
      })
      customerId = customer.id

      // Pré-crée la ligne user_subscriptions avec le customer ID.
      // Statut 'incomplete' : aucun droit accordé tant que le paiement n'est pas
      // confirmé par le webhook (qui posera status='active' + subscription_id).
      await sb.from('user_subscriptions').upsert(
        { user_id: userId, tier: 'premium', stripe_customer_id: customerId, status: 'incomplete' },
        { onConflict: 'user_id' },
      )
      console.log('[checkout] new customer created:', customerId)
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[checkout] customer error:', msg)
    return NextResponse.json({ error: `Erreur création client Stripe : ${msg}` }, { status: 500 })
  }

  // ── Checkout Session ──────────────────────────────────────────
  try {
    const origin = req.headers.get('origin')
      ?? process.env.NEXT_PUBLIC_APP_URL
      ?? 'https://thw-coaching.vercel.app'

    const session = await stripe.checkout.sessions.create({
      customer:              customerId,
      line_items:            [{ price: priceId, quantity: 1 }],
      mode:                  'subscription',
      success_url:           `${origin}/settings/subscription?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:            `${origin}/settings/subscription?canceled=true`,
      allow_promotion_codes: true,
      metadata:              checkoutMeta,
      subscription_data: {
        metadata: checkoutMeta,
      },
      locale: 'fr',
    })

    console.log('[checkout] session url:', session.url)
    return NextResponse.json({ url: session.url })

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[checkout] stripe error:', msg)
    return NextResponse.json({ error: `Erreur Stripe : ${msg}` }, { status: 500 })
  }
}
