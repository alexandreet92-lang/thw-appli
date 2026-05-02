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

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer:   sub.stripe_customer_id,
      return_url: `${origin}/settings/subscription`,
    })
    return NextResponse.json({ url: session.url })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[portal] stripe error:', msg)

    // Customer introuvable (ex : customer Live utilisé en mode Test)
    // On nettoie l'ID obsolète afin que le prochain checkout en crée un nouveau.
    if (msg.includes('No such customer')) {
      await sb
        .from('user_subscriptions')
        .update({ stripe_customer_id: null })
        .eq('user_id', user.id)

      return NextResponse.json(
        { error: 'Aucun abonnement actif trouvé. Veuillez souscrire un abonnement pour accéder au portail.' },
        { status: 404 },
      )
    }

    return NextResponse.json({ error: `Erreur Stripe : ${msg}` }, { status: 500 })
  }
}
