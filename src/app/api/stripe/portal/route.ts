// ══════════════════════════════════════════════════════════════
// POST /api/stripe/portal
// Crée une Stripe Billing Portal Session pour gérer l'abonnement.
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
  const sb = createServiceClient()
  const { data: sub } = await sb
    .from('user_subscriptions')
    .select('stripe_customer_id')
    .eq('user_id', user.id)
    .single()

  if (!sub?.stripe_customer_id) {
    return NextResponse.json(
      { error: 'Aucun abonnement Stripe trouvé pour cet utilisateur' },
      { status: 404 },
    )
  }

  // ── Billing Portal Session ────────────────────────────────────
  const origin = req.headers.get('origin')
    ?? process.env.NEXT_PUBLIC_APP_URL
    ?? 'https://thw-coaching.vercel.app'

  const session = await stripe.billingPortal.sessions.create({
    customer:   sub.stripe_customer_id,
    return_url: `${origin}/settings/subscription`,
  })

  return NextResponse.json({ url: session.url })
}
