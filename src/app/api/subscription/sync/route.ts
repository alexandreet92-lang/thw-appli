// ══════════════════════════════════════════════════════════════
// GET /api/subscription/sync?session_id=cs_...
// Débloque l'abonnement IMMÉDIATEMENT au retour du paiement, sans attendre le
// webhook Stripe (qui est asynchrone). On récupère la Checkout Session, on
// vérifie qu'elle appartient bien à l'utilisateur connecté ET qu'elle est payée,
// puis on upsert user_subscriptions (idempotent avec le webhook).
// ══════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { stripe, getTierFromPriceId } from '@/lib/stripe/config'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  // ── Auth ──────────────────────────────────────────────────────
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const sessionId = req.nextUrl.searchParams.get('session_id')
  if (!sessionId) return NextResponse.json({ error: 'session_id manquant' }, { status: 400 })

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId)

    // Sécurité : la session doit appartenir à l'utilisateur connecté.
    const sessUser = session.metadata?.userId ?? session.client_reference_id ?? null
    if (sessUser && sessUser !== user.id) {
      return NextResponse.json({ error: 'Session non autorisée' }, { status: 403 })
    }

    // Le paiement doit être confirmé.
    if (session.payment_status !== 'paid') {
      return NextResponse.json({ synced: false, pending: true, status: session.payment_status })
    }
    if (session.mode !== 'subscription' || !session.subscription) {
      // Achats de tokens / packs : gérés par le webhook, rien à débloquer ici.
      return NextResponse.json({ synced: false })
    }

    const subscription = await stripe.subscriptions.retrieve(session.subscription as string)
    const priceId = subscription.items.data[0]?.price.id ?? ''
    const tier = getTierFromPriceId(priceId)
    if (!tier) {
      console.error('[subscription/sync] prix inconnu:', priceId)
      return NextResponse.json({ synced: false, error: 'prix inconnu' })
    }

    const custId = typeof session.customer === 'string' ? session.customer : session.customer?.id ?? null

    const sb = createServiceClient()
    await sb.from('user_subscriptions').upsert(
      {
        user_id:                user.id,
        tier,
        stripe_customer_id:     custId,
        stripe_subscription_id: subscription.id,
        current_period_start:   new Date(subscription.current_period_start * 1000).toISOString(),
        current_period_end:     new Date(subscription.current_period_end   * 1000).toISOString(),
        status:                 subscription.status === 'trialing' ? 'trialing' : 'active',
      },
      { onConflict: 'user_id' },
    )

    return NextResponse.json({ synced: true, tier })
  } catch (e) {
    console.error('[subscription/sync] error:', e)
    return NextResponse.json({ error: 'Erreur de synchronisation' }, { status: 500 })
  }
}
