// ══════════════════════════════════════════════════════════════
// POST /api/stripe/webhook
// Handler Stripe — vérifie la signature, gère les events.
// ⚠️ Pas d'auth utilisateur : protégé par signature Stripe.
// ⚠️ Body lu en raw text (req.text()) pour la vérification.
// ══════════════════════════════════════════════════════════════

export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import type Stripe from 'stripe'
import { stripe, getTierFromPriceId } from '@/lib/stripe/config'
import { createServiceClient } from '@/lib/supabase/server'
import type { TierName } from '@/lib/subscriptions/tier-limits'

// ── Helpers ────────────────────────────────────────────────────

function customerId(
  customer: string | Stripe.Customer | Stripe.DeletedCustomer | null,
): string | null {
  if (!customer) return null
  return typeof customer === 'string' ? customer : customer.id
}

function mapStatus(
  status: Stripe.Subscription.Status,
): 'active' | 'canceled' | 'past_due' | 'trialing' {
  if (status === 'trialing')  return 'trialing'
  if (status === 'canceled')  return 'canceled'
  if (status === 'past_due')  return 'past_due'
  return 'active'
}

// ── Handler ────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // ── Vérification signature ────────────────────────────────────
  const body = await req.text()  // raw body obligatoire
  const sig  = req.headers.get('stripe-signature')

  if (!sig) {
    return NextResponse.json({ error: 'Signature manquante' }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET ?? '',
    )
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[stripe/webhook] Signature invalide:', msg)
    return NextResponse.json({ error: `Signature invalide: ${msg}` }, { status: 400 })
  }

  const sb = createServiceClient()

  // ── Dispatch events ───────────────────────────────────────────
  try {
    switch (event.type) {

      // ── checkout.session.completed ──────────────────────────
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        if (session.mode !== 'subscription') break

        const userId = session.metadata?.userId
        if (!userId) {
          console.warn('[stripe/webhook] checkout.session.completed: userId manquant dans metadata')
          break
        }

        const subscriptionId = session.subscription as string
        const custId         = customerId(session.customer)
        if (!custId) break

        // Récupère les détails de l'abonnement
        const subscription = await stripe.subscriptions.retrieve(subscriptionId)
        const priceId      = subscription.items.data[0]?.price.id ?? ''
        const tier: TierName = getTierFromPriceId(priceId)

        await sb.from('user_subscriptions').upsert(
          {
            user_id:                userId,
            tier,
            stripe_customer_id:     custId,
            stripe_subscription_id: subscriptionId,
            current_period_start:   new Date(subscription.current_period_start * 1000).toISOString(),
            current_period_end:     new Date(subscription.current_period_end   * 1000).toISOString(),
            status:                 mapStatus(subscription.status),
          },
          { onConflict: 'user_id' },
        )

        console.log(`[stripe/webhook] checkout.session.completed → user ${userId} → tier ${tier}`)
        break
      }

      // ── customer.subscription.updated ──────────────────────
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        const custId       = customerId(subscription.customer)
        if (!custId) break

        // Retrouve l'utilisateur via le customer ID
        const { data: subRow } = await sb
          .from('user_subscriptions')
          .select('user_id')
          .eq('stripe_customer_id', custId)
          .single()

        if (!subRow) {
          console.warn('[stripe/webhook] subscription.updated: customer non trouvé:', custId)
          break
        }

        const priceId    = subscription.items.data[0]?.price.id ?? ''
        const tier: TierName = getTierFromPriceId(priceId)

        await sb.from('user_subscriptions').update({
          tier,
          status:               mapStatus(subscription.status),
          current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
          current_period_end:   new Date(subscription.current_period_end   * 1000).toISOString(),
        }).eq('user_id', subRow.user_id)

        console.log(`[stripe/webhook] subscription.updated → user ${subRow.user_id} → tier ${tier} status ${subscription.status}`)
        break
      }

      // ── customer.subscription.deleted ──────────────────────
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        const custId       = customerId(subscription.customer)
        if (!custId) break

        const { data: subRow } = await sb
          .from('user_subscriptions')
          .select('user_id')
          .eq('stripe_customer_id', custId)
          .single()

        if (!subRow) break

        // Downgrade vers premium + status canceled
        await sb.from('user_subscriptions').update({
          tier:   'premium',
          status: 'canceled',
        }).eq('user_id', subRow.user_id)

        console.log(`[stripe/webhook] subscription.deleted → user ${subRow.user_id} → downgraded to premium`)
        break
      }

      // ── invoice.payment_failed ──────────────────────────────
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        const custId  = customerId(invoice.customer)
        if (!custId) break

        const { data: subRow } = await sb
          .from('user_subscriptions')
          .select('user_id')
          .eq('stripe_customer_id', custId)
          .single()

        if (!subRow) break

        await sb.from('user_subscriptions').update({
          status: 'past_due',
        }).eq('user_id', subRow.user_id)

        console.log(`[stripe/webhook] invoice.payment_failed → user ${subRow.user_id} → past_due`)
        break
      }

      default:
        // Event non géré — on ignore silencieusement
        break
    }
  } catch (err) {
    console.error('[stripe/webhook] Erreur handler:', err)
    return NextResponse.json({ error: 'Erreur interne du webhook' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
