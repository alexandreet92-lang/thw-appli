// ══════════════════════════════════════════════════════════════
// GET /api/subscriptions/summary
// Retourne le tier + l'usage de la période en cours pour l'utilisateur.
// ══════════════════════════════════════════════════════════════

import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { getUsageSummary, trialDaysLeft } from '@/lib/subscriptions/check-quota'
import { communityEntitlements } from '@/lib/subscriptions/tier-limits'

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

  return NextResponse.json({
    ...summary,
    subscription: sub ?? null,
    trial_days_left,
    // Capacités « créateur » de la Communauté, dérivées du tier (gating UI ;
    // la vérification dure reste côté serveur — RLS + /api/community/spaces).
    community: communityEntitlements(summary.tier, summary.unlimited),
  })
}
