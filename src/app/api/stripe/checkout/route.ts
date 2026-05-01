// ══════════════════════════════════════════════════════════════
// POST /api/stripe/checkout
// Crée une Stripe Checkout Session pour un tier + période donnés.
// Body : { tier: TierName, billingPeriod: 'monthly' | 'yearly' }
// Return : { url: string }
// ══════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { stripe, getPriceId } from '@/lib/stripe/config'
import type { TierName } from '@/lib/subscriptions/tier-limits'

const VALID_TIERS: TierName[] = ['premium', 'pro', 'expert']
const VALID_PERIODS = ['monthly', 'yearly'] as const
type BillingPeriod = (typeof VALID_PERIODS)[number]

export async function POST(req: NextRequest) {
  // ── Auth ─────────────────────────────────────────────────────
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  // ── Validation body ───────────────────────────────────────────
  let tier: TierName
  let billingPeriod: BillingPeriod

  try {
    const body = await req.json() as { tier?: unknown; billingPeriod?: unknown }
    if (!VALID_TIERS.includes(body.tier as TierName)) {
      return NextResponse.json({ error: 'Tier invalide' }, { status: 400 })
    }
    if (!VALID_PERIODS.includes(body.billingPeriod as BillingPeriod)) {
      return NextResponse.json({ error: 'billingPeriod invalide (monthly|yearly)' }, { status: 400 })
    }
    tier = body.tier as TierName
    billingPeriod = body.billingPeriod as BillingPeriod
  } catch {
    return NextResponse.json({ error: 'JSON invalide' }, { status: 400 })
  }

  // ── Résolution Price ID ───────────────────────────────────────
  const priceId = getPriceId(tier, billingPeriod)
  if (!priceId) {
    return NextResponse.json(
      { error: `Price ID non configuré pour ${tier}/${billingPeriod}` },
      { status: 500 },
    )
  }

  // ── Customer Stripe (récupère ou crée) ────────────────────────
  const sb = createServiceClient()
  const { data: sub } = await sb
    .from('user_subscriptions')
    .select('stripe_customer_id')
    .eq('user_id', user.id)
    .single()

  let customerId = sub?.stripe_customer_id ?? null

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email ?? undefined,
      metadata: { userId: user.id },
    })
    customerId = customer.id

    // Pré-crée la ligne user_subscriptions avec le customer ID
    // (le webhook la complétera avec tier/subscription ID)
    await sb.from('user_subscriptions').upsert(
      {
        user_id:            user.id,
        tier:               'premium',
        stripe_customer_id: customerId,
        status:             'active',
      },
      { onConflict: 'user_id' },
    )
  }

  // ── Checkout Session ──────────────────────────────────────────
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
    metadata:              { userId: user.id, tier },
    subscription_data: {
      metadata: { userId: user.id, tier },
    },
    locale: 'fr',
  })

  return NextResponse.json({ url: session.url })
}
