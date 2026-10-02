// ══════════════════════════════════════════════════════════════
// GET /api/subscriptions/summary
// Retourne le tier + l'usage de la période en cours pour l'utilisateur.
// ══════════════════════════════════════════════════════════════

import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { getUsageSummary, trialDaysLeft } from '@/lib/subscriptions/check-quota'
import { communityEntitlements } from '@/lib/subscriptions/tier-limits'
import { billingSourceOf, type BillingSources } from '@/lib/subscriptions/billing-source'

export async function GET() {
  // ── Auth ─────────────────────────────────────────────────────
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  // ── Usage summary ─────────────────────────────────────────────
  const summary = await getUsageSummary(user.id)

  // ── Subscription info (stripe_customer_id, status, period) ───
  const sb = createServiceClient()
  const { data: sub } = await sb
    .from('user_subscriptions')
    .select('tier, status, stripe_customer_id, stripe_subscription_id, current_period_end, current_period_start')
    .eq('user_id', user.id)
    .single()

  // Jours d'essai premium restants (null si l'utilisateur a un abonnement payant).
  const hasPaidSub = !!sub && (sub.status === 'active' || sub.status === 'trialing')
  const trial_days_left = hasPaidSub ? null : await trialDaysLeft(user.id)

  // Source de facturation (App Store vs Stripe) → où gérer / résilier.
  // Requêtes séparées : un échec ici ne doit jamais casser le résumé.
  const billing: BillingSources = { athlete: null, coach: null }
  try {
    const [{ data: us }, { data: cs }] = await Promise.all([
      sb.from('user_subscriptions').select('store, stripe_subscription_id').eq('user_id', user.id).maybeSingle(),
      sb.from('coach_subscriptions').select('store, stripe_customer_id').eq('user_id', user.id).maybeSingle(),
    ])
    billing.athlete = billingSourceOf(us)
    billing.coach = billingSourceOf(cs, true)
  } catch { /* billing reste inconnu (null) */ }

  return NextResponse.json({
    ...summary,
    subscription: sub ?? null,
    trial_days_left,
    billing,
    // Capacités « créateur » de la Communauté, dérivées du tier (gating UI ;
    // la vérification dure reste côté serveur — RLS + /api/community/spaces).
    community: communityEntitlements(summary.tier, summary.unlimited),
  })
}
