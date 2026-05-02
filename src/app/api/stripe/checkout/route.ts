// ══════════════════════════════════════════════════════════════
// POST /api/stripe/checkout
// Crée une Stripe Checkout Session pour un tier + période donnés.
// Body  : { tier: TierName, billingPeriod: 'monthly' | 'yearly' }
// Return: { url: string }
// ══════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { stripe, getPriceId } from '@/lib/stripe/config'
import type { TierName } from '@/lib/subscriptions/tier-limits'

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
  let tier: TierName
  let billingPeriod: BillingPeriod

  try {
    const body = await req.json() as { tier?: unknown; billingPeriod?: unknown }
    console.log('[checkout] received:', { tier: body.tier, billingPeriod: body.billingPeriod })

    if (!VALID_TIERS.includes(body.tier as TierName)) {
      return NextResponse.json({ error: `Tier invalide : ${String(body.tier)}` }, { status: 400 })
    }
    if (!VALID_PERIODS.includes(body.billingPeriod as BillingPeriod)) {
      return NextResponse.json({ error: `billingPeriod invalide : ${String(body.billingPeriod)}` }, { status: 400 })
    }
    tier          = body.tier as TierName
    billingPeriod = body.billingPeriod as BillingPeriod
  } catch (err) {
    console.error('[checkout] body parse error:', err)
    return NextResponse.json({ error: 'Corps de requête JSON invalide' }, { status: 400 })
  }

  // ── Résolution Price ID ───────────────────────────────────────
  const priceId = getPriceId(tier, billingPeriod)
  console.log('[checkout] priceId:', priceId ?? '(undefined — env var manquante)')

  if (!priceId) {
    return NextResponse.json(
      { error: `Price ID non configuré : STRIPE_PRICE_${tier.toUpperCase()}_${billingPeriod.toUpperCase()} manquant` },
      { status: 500 },
    )
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

        // Met à jour la ligne user_subscriptions avec le nouveau customer ID
        await sb.from('user_subscriptions').upsert(
          { user_id: userId, tier: 'premium', stripe_customer_id: customerId, status: 'active' },
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

      // Pré-crée la ligne user_subscriptions avec le customer ID
      await sb.from('user_subscriptions').upsert(
        { user_id: userId, tier: 'premium', stripe_customer_id: customerId, status: 'active' },
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
      success_url:           `${origin}/settings/subscription?success=true`,
      cancel_url:            `${origin}/settings/subscription?canceled=true`,
      allow_promotion_codes: true,
      metadata:              { userId, tier },
      subscription_data: {
        metadata: { userId, tier },
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
