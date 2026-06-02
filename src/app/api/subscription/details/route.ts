// ══════════════════════════════════════════════════════════════
// GET /api/subscription/details
// Agrège données abonnement : Supabase + Stripe + token limits.
// ══════════════════════════════════════════════════════════════

import { NextResponse }            from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { stripe }                  from '@/lib/stripe/config'
import { getUserTokenLimits }      from '@/lib/tokens/limits'

export async function GET() {
  // ── Auth ─────────────────────────────────────────────────────
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const sb = createServiceClient()

  // ── Abonnement Supabase ───────────────────────────────────────
  const { data: sub } = await sb
    .from('user_subscriptions')
    .select('tier, stripe_subscription_id, stripe_customer_id, current_period_end, status, cancel_at_period_end')
    .eq('user_id', user.id)
    .single()

  // ── Token limits ──────────────────────────────────────────────
  const limits = await getUserTokenLimits(user.id)

  const base = {
    tier:               sub?.tier               ?? limits.plan ?? 'trial',
    status:             sub?.status             ?? 'active',
    cancel_at_period_end: sub?.cancel_at_period_end ?? false,
    current_period_end: sub?.current_period_end ?? null,
    monthly:            limits.monthly,
    rolling_6h:         limits.rolling_6h,
    stripe:             null  as null | {
      nextBillingDate?:  string | null
      amount?:           number | null
      currency?:         string | null
      cancelAtPeriodEnd?: boolean | null
    },
    invoices:           [] as { amount: number; currency: string; date: string; status: string; url?: string | null }[],
    paymentMethod:      null as null | { brand: string; last4: string; exp_month: number; exp_year: number },
  }

  // ── Stripe data (si subscription active) ─────────────────────
  if (sub?.stripe_subscription_id && sub?.stripe_customer_id) {
    try {
      // Subscription Stripe
      const stripeSub = await stripe.subscriptions.retrieve(sub.stripe_subscription_id, {
        expand: ['default_payment_method'],
      })

      const item       = stripeSub.items.data[0]
      const amount     = item?.price?.unit_amount ?? null
      const currency   = item?.price?.currency    ?? null
      const nextBilling = new Date((stripeSub.current_period_end) * 1000).toISOString()

      base.stripe = {
        nextBillingDate:   nextBilling,
        amount,
        currency,
        cancelAtPeriodEnd: stripeSub.cancel_at_period_end,
      }

      // Dernières factures
      const invoiceList = await stripe.invoices.list({
        customer: sub.stripe_customer_id,
        limit:    3,
      })
      base.invoices = invoiceList.data
        .filter(inv => inv.status !== 'draft')
        .slice(0, 2)
        .map(inv => ({
          amount:   inv.amount_paid,
          currency: inv.currency,
          date:     new Date(inv.created * 1000).toISOString(),
          status:   inv.status ?? 'unknown',
          url:      inv.hosted_invoice_url ?? null,
        }))

      // Moyen de paiement
      const customer = await stripe.customers.retrieve(sub.stripe_customer_id, {
        expand: ['invoice_settings.default_payment_method'],
      })
      if (!customer.deleted) {
        const pm = customer.invoice_settings?.default_payment_method
        if (pm && typeof pm !== 'string' && pm.card) {
          base.paymentMethod = {
            brand:     pm.card.brand   ?? 'card',
            last4:     pm.card.last4   ?? '****',
            exp_month: pm.card.exp_month ?? 0,
            exp_year:  pm.card.exp_year  ?? 0,
          }
        }
      }
    } catch (err) {
      // Stripe optionnel — on renvoie quand même les données de base
      console.error('[subscription/details] stripe fetch error:', err instanceof Error ? err.message : err)
    }
  }

  return NextResponse.json(base)
}
