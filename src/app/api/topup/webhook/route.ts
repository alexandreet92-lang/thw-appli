// POST /api/topup/webhook — crédite le wallet après paiement Stripe réussi
import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { stripe } from '@/lib/stripe/config'
import type Stripe from 'stripe'

export const dynamic = 'force-dynamic'

const webhookSecret = process.env.STRIPE_TOPUP_WEBHOOK_SECRET ?? process.env.STRIPE_WEBHOOK_SECRET ?? ''

export async function POST(req: Request) {
  const body = await req.text()
  const signature = req.headers.get('stripe-signature')
  if (!signature || !webhookSecret) {
    return NextResponse.json({ error: 'Webhook non configuré' }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (err) {
    console.error('[topup/webhook] signature invalide:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session
    const meta = session.metadata ?? {}
    const purchaseId = meta.purchase_id
    const userId = meta.user_id
    const tokensAmount = parseInt(meta.tokens_amount ?? '0', 10)

    if (purchaseId && userId && tokensAmount > 0) {
      const sb = createServiceClient()

      await sb.from('token_purchases').update({
        status: 'completed',
        stripe_payment_intent_id: typeof session.payment_intent === 'string' ? session.payment_intent : null,
        completed_at: new Date().toISOString(),
      }).eq('id', purchaseId)

      const { data: wallet } = await sb
        .from('user_token_wallet')
        .select('bonus_tokens')
        .eq('user_id', userId)
        .maybeSingle()

      const newBalance = (wallet?.bonus_tokens ?? 0) + tokensAmount

      // upsert : crée le wallet s'il n'existe pas encore
      await sb.from('user_token_wallet').upsert(
        { user_id: userId, bonus_tokens: newBalance, updated_at: new Date().toISOString() },
        { onConflict: 'user_id' },
      )

      await sb.from('topup_sessions')
        .update({ used_at: new Date().toISOString() })
        .eq('user_id', userId)
        .is('used_at', null)
    }
  }

  return NextResponse.json({ received: true })
}
