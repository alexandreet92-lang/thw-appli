// ══════════════════════════════════════════════════════════════
// POST /api/subscription/cancel
// Programme la résiliation de l'abonnement Stripe à la fin de la période.
// ══════════════════════════════════════════════════════════════

import { NextResponse }            from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { stripe }                  from '@/lib/stripe/config'

export async function POST() {
  // ── Auth ─────────────────────────────────────────────────────
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const sb = createServiceClient()

  // ── Récupère l'abonnement ─────────────────────────────────────
  const { data: sub } = await sb
    .from('user_subscriptions')
    .select('stripe_subscription_id')
    .eq('user_id', user.id)
    .single()

  if (!sub?.stripe_subscription_id) {
    return NextResponse.json({ error: 'Aucun abonnement Stripe actif' }, { status: 404 })
  }

  // ── Résiliation différée ──────────────────────────────────────
  try {
    await stripe.subscriptions.update(sub.stripe_subscription_id, {
      cancel_at_period_end: true,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[subscription/cancel] stripe error:', msg)
    return NextResponse.json({ error: `Erreur Stripe : ${msg}` }, { status: 500 })
  }

  // ── Mise à jour Supabase ──────────────────────────────────────
  await sb
    .from('user_subscriptions')
    .update({ cancel_at_period_end: true })
    .eq('user_id', user.id)

  return NextResponse.json({ ok: true })
}
