// ══════════════════════════════════════════════════════════════
// POST /api/studio/checkout
// Achat d'un pack de tokens STUDIO (paiement unique, pas d'abonnement).
// Body  : { pack: 'decouverte' | 'builder' | 'architecte' }
// Return: { url: string }
// Env   : STRIPE_PRICE_STUDIO_DECOUVERTE / _BUILDER / _ARCHITECTE
// Le crédit du wallet se fait dans le webhook (checkout.session.completed,
// mode 'payment', metadata.studioPack).
// ══════════════════════════════════════════════════════════════

export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { stripe } from '@/lib/stripe/config'
import { getStudioAccess } from '@/lib/tokens/studio'
import { STUDIO_PACKS, type StudioPackKey } from '@/lib/studio/offers'

const PRICE_ENV: Record<StudioPackKey, string | undefined> = {
  decouverte: process.env.STRIPE_PRICE_STUDIO_DECOUVERTE,
  builder:    process.env.STRIPE_PRICE_STUDIO_BUILDER,
  architecte: process.env.STRIPE_PRICE_STUDIO_ARCHITECTE,
}

export async function POST(req: NextRequest) {
  // ── Auth ─────────────────────────────────────────────────────
  let userId: string
  let userEmail: string | undefined
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    userId    = user.id
    userEmail = user.email ?? undefined
  } catch {
    return NextResponse.json({ error: 'Erreur d\'authentification' }, { status: 401 })
  }

  // ── Les packs sont réservés aux tiers qui ont accès au Studio ──
  const access = await getStudioAccess(userId)
  if (!access.allowed) {
    return NextResponse.json({ error: 'Les packs Studio nécessitent un abonnement Pro ou Expert.' }, { status: 403 })
  }

  // ── Validation ────────────────────────────────────────────────
  let packKey: StudioPackKey
  try {
    const body = await req.json() as { pack?: unknown }
    const found = STUDIO_PACKS.find(p => p.key === body.pack)
    if (!found) return NextResponse.json({ error: `Pack invalide : ${String(body.pack)}` }, { status: 400 })
    packKey = found.key
  } catch {
    return NextResponse.json({ error: 'Corps de requête JSON invalide' }, { status: 400 })
  }

  const pack = STUDIO_PACKS.find(p => p.key === packKey)!
  const priceId = PRICE_ENV[packKey]
  if (!priceId) {
    return NextResponse.json(
      { error: `Price ID non configuré : STRIPE_PRICE_STUDIO_${packKey.toUpperCase()} manquant` },
      { status: 500 },
    )
  }

  // ── Checkout Session (paiement unique) ────────────────────────
  try {
    const origin = req.headers.get('origin')
      ?? process.env.NEXT_PUBLIC_APP_URL
      ?? 'https://thw-coaching.vercel.app'

    const session = await stripe.checkout.sessions.create({
      customer_email: userEmail,
      line_items:     [{ price: priceId, quantity: 1 }],
      mode:           'payment',
      success_url:    `${origin}/?studio_pack=success`,
      cancel_url:     `${origin}/?studio_pack=canceled`,
      metadata:       { userId, studioPack: packKey, studioTokens: String(pack.tokens) },
      locale:         'fr',
    })

    return NextResponse.json({ url: session.url })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[studio/checkout] stripe error:', msg)
    return NextResponse.json({ error: `Erreur Stripe : ${msg}` }, { status: 500 })
  }
}
