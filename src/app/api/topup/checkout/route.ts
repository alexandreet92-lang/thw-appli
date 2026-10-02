// ══════════════════════════════════════════════════════════════
// POST /api/topup/checkout — achat DIRECT d'un pack de tokens (web).
// Utilisateur authentifié (cookie Supabase) : plus de lien par email.
// Body  : { pack_id: 'discovery' | 'performance' | 'elite', return_path?: string }
// Return: { checkout_url: string }
//
// Crédit : identique au parcours historique — ligne token_purchases
// 'pending' + metadata { purchase_id, user_id, pack_id, tokens_amount }
// → /api/topup/webhook (checkout.session.completed) passe l'achat en
// 'completed' et crédite user_token_wallet.bonus_tokens.
//
// Web uniquement : dans l'app iOS, les tokens s'achètent en achat
// intégré Apple (RevenueCat) — jamais de lien de paiement externe.
// ══════════════════════════════════════════════════════════════
import { NextResponse, type NextRequest } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { stripe } from '@/lib/stripe/config'
import { getTokenPack } from '@/lib/topup/packs'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/** Chemin interne sûr (pas d'URL absolue ni de « // » → pas d'open redirect). */
function safePath(p: unknown): string {
  return typeof p === 'string' && p.startsWith('/') && !p.startsWith('//') ? p : '/'
}

export async function POST(req: NextRequest) {
  // ── Auth ─────────────────────────────────────────────────────
  let userId: string
  let userEmail: string | undefined
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    userId = user.id
    userEmail = user.email ?? undefined
  } catch {
    return NextResponse.json({ error: 'Erreur d\'authentification' }, { status: 401 })
  }

  // ── Validation ────────────────────────────────────────────────
  let body: { pack_id?: unknown; return_path?: unknown }
  try {
    body = await req.json() as { pack_id?: unknown; return_path?: unknown }
  } catch {
    return NextResponse.json({ error: 'Corps de requête JSON invalide' }, { status: 400 })
  }
  const pack = getTokenPack(body.pack_id)
  if (!pack) return NextResponse.json({ error: 'Pack invalide' }, { status: 400 })
  const returnPath = safePath(body.return_path)

  try {
    const sb = createServiceClient()
    const { data: purchase, error: purchaseErr } = await sb
      .from('token_purchases')
      .insert({
        user_id: userId,
        pack_id: pack.id,
        tokens_amount: pack.tokens,
        price_eur: pack.priceCents / 100,
        status: 'pending',
      })
      .select()
      .single()
    if (purchaseErr || !purchase) {
      console.error('[topup/checkout] purchase insert error:', purchaseErr)
      return NextResponse.json({ error: 'Erreur création transaction' }, { status: 500 })
    }

    const origin = req.headers.get('origin')
      ?? process.env.NEXT_PUBLIC_APP_URL
      ?? 'https://thw-coaching.vercel.app'

    const checkoutSession = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'eur',
          product_data: { name: pack.stripeName },
          unit_amount: pack.priceCents,
        },
        quantity: 1,
      }],
      mode: 'payment',
      customer_email: userEmail,
      client_reference_id: userId,
      success_url: `${origin}/topup/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}${returnPath}`,
      metadata: {
        purchase_id: String(purchase.id),
        user_id: userId,
        pack_id: pack.id,
        tokens_amount: pack.tokens.toString(),
      },
    })

    await sb.from('token_purchases').update({ stripe_session_id: checkoutSession.id }).eq('id', purchase.id)

    if (!checkoutSession.url) return NextResponse.json({ error: 'Session de paiement indisponible' }, { status: 500 })
    return NextResponse.json({ checkout_url: checkoutSession.url })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('[topup/checkout] error:', msg)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
