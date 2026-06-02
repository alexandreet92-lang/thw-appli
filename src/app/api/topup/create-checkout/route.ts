// POST /api/topup/create-checkout — Stripe Checkout pour un pack de tokens
import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { stripe } from '@/lib/stripe/config'

export const dynamic = 'force-dynamic'

const TOPUP_BASE_URL = process.env.TOPUP_BASE_URL ?? 'https://thwcoaching.com/topup'

const PACKS = {
  discovery:   { tokens: 100000,  price: 400,  name: 'Pack Découverte 100k tokens' },
  performance: { tokens: 500000,  price: 1500, name: 'Pack Performance 500k tokens' },
  elite:       { tokens: 1000000, price: 2500, name: 'Pack Elite 1M tokens' },
} as const

type PackId = keyof typeof PACKS

export async function POST(req: Request) {
  try {
    const { session_token, pack_id } = await req.json() as { session_token?: string; pack_id?: string }
    if (!session_token) return NextResponse.json({ error: 'Token requis' }, { status: 400 })

    const sb = createServiceClient()
    const { data: session } = await sb
      .from('topup_sessions')
      .select('*')
      .eq('session_token', session_token)
      .maybeSingle()

    if (!session || new Date(session.expires_at) < new Date()) {
      return NextResponse.json({ error: 'Session invalide ou expirée' }, { status: 410 })
    }

    const pack = PACKS[pack_id as PackId]
    if (!pack) return NextResponse.json({ error: 'Pack invalide' }, { status: 400 })

    const { data: purchase, error: purchaseErr } = await sb
      .from('token_purchases')
      .insert({
        user_id: session.user_id,
        pack_id,
        tokens_amount: pack.tokens,
        price_eur: pack.price / 100,
        status: 'pending',
      })
      .select()
      .single()
    if (purchaseErr || !purchase) {
      console.error('[topup/create-checkout] purchase insert error:', purchaseErr)
      return NextResponse.json({ error: 'Erreur création transaction' }, { status: 500 })
    }

    const checkoutSession = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'eur',
          product_data: { name: pack.name },
          unit_amount: pack.price,
        },
        quantity: 1,
      }],
      mode: 'payment',
      customer_email: session.email,
      success_url: `${TOPUP_BASE_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${TOPUP_BASE_URL}?session=${session_token}`,
      metadata: {
        purchase_id: purchase.id,
        user_id: session.user_id,
        pack_id: pack_id as string,
        tokens_amount: pack.tokens.toString(),
      },
    })

    await sb.from('token_purchases').update({ stripe_session_id: checkoutSession.id }).eq('id', purchase.id)

    return NextResponse.json({ checkout_url: checkoutSession.url })
  } catch (e) {
    console.error('[topup/create-checkout] error:', e)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
