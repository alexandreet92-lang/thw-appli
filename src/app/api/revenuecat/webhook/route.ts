// ══════════════════════════════════════════════════════════════
// POST /api/revenuecat/webhook
// Reçoit les événements RevenueCat (achats in-app Apple/Google) et débloque
// l'accès EXACTEMENT comme le webhook Stripe : abonnement → user_subscriptions
// / coach_subscriptions ; tokens → user_token_wallet.
//
// Auth : header Authorization == REVENUECAT_WEBHOOK_SECRET (configuré dans
// le dashboard RevenueCat). Idempotence via la table iap_events.
//
// app_user_id = id Supabase de l'utilisateur (posé côté app par
// Purchases.logIn(userId) AVANT tout achat).
// ══════════════════════════════════════════════════════════════

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { notifyUser } from '@/lib/notifications/dispatch'
import { parseIapProduct } from '@/lib/iap/products'
import { getCoachPack, athleteTierForCoachTier } from '@/lib/subscriptions/coach-packs'

interface RcEvent {
  id?: string
  type?: string
  app_user_id?: string
  product_id?: string
  expiration_at_ms?: number | null
  purchased_at_ms?: number | null
}

const GRANTING = new Set(['INITIAL_PURCHASE', 'RENEWAL', 'UNCANCELLATION', 'PRODUCT_CHANGE', 'SUBSCRIPTION_EXTENDED'])

export async function POST(req: NextRequest) {
  // ── Auth ──
  const secret = process.env.REVENUECAT_WEBHOOK_SECRET ?? ''
  const auth = req.headers.get('authorization') ?? ''
  if (!secret || auth !== secret) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  let body: { event?: RcEvent }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'bad json' }, { status: 400 }) }
  const ev = body.event
  if (!ev?.type) return NextResponse.json({ received: true })

  const userId = ev.app_user_id ?? ''
  // Ids anonymes RevenueCat (achat avant logIn) : impossible à rattacher.
  if (!userId || userId.startsWith('$RCAnonymousID')) {
    console.warn('[revenuecat/webhook] app_user_id anonyme/absent, ignoré:', ev.type)
    return NextResponse.json({ received: true })
  }

  const sb = createServiceClient()

  // ── Idempotence ──
  if (ev.id) {
    const { error: dupErr } = await sb.from('iap_events')
      .insert({ event_id: ev.id, event_type: ev.type, user_id: userId })
    if (dupErr) {
      // conflit clé primaire = déjà traité → on ne rejoue pas.
      console.log('[revenuecat/webhook] event déjà traité:', ev.id)
      return NextResponse.json({ received: true, duplicate: true })
    }
  }

  const product = ev.product_id ? parseIapProduct(ev.product_id) : null
  const periodEnd = ev.expiration_at_ms ? new Date(ev.expiration_at_ms).toISOString() : null
  const now = new Date().toISOString()

  try {
    // ── TOKENS (achat consommable) ──
    if (ev.type === 'NON_RENEWING_PURCHASE' && product?.kind === 'tokens') {
      const { data: wallet } = await sb.from('user_token_wallet').select('bonus_tokens').eq('user_id', userId).maybeSingle()
      const newBalance = (wallet?.bonus_tokens ?? 0) + product.amount
      await sb.from('user_token_wallet').upsert(
        { user_id: userId, bonus_tokens: newBalance, updated_at: now }, { onConflict: 'user_id' },
      )
      void notifyUser(userId, 'tokens.pack_credite', {
        title: 'Tokens ajoutés ✅',
        body: `${product.amount.toLocaleString('fr-FR')} tokens ont été crédités sur ton compte.`,
        url: '/settings/subscription', dedupKey: `iap-${ev.id ?? product.amount}`, once: true,
      })
      return NextResponse.json({ received: true })
    }

    if (!product) return NextResponse.json({ received: true })

    // ── EXPIRATION / révocation ──
    if (ev.type === 'EXPIRATION') {
      if (product.kind === 'athlete_sub') {
        await sb.from('user_subscriptions').update({ status: 'canceled', updated_at: now }).eq('user_id', userId)
      } else if (product.kind === 'coach_sub') {
        await sb.from('coach_subscriptions').update({ status: 'canceled', updated_at: now }).eq('user_id', userId)
        await sb.from('profiles').update({ coach_subscribed: false }).eq('id', userId)
        await sb.from('user_subscriptions').update({ status: 'canceled', updated_at: now }).eq('user_id', userId)
      } else if (product.kind === 'coach_addon') {
        // Fin de l'option → l'expérience athlète du coach retombe à premium.
        await sb.from('user_subscriptions').update({ tier: 'premium', updated_at: now }).eq('user_id', userId)
        await sb.from('coach_subscriptions').update({ included_tier: 'premium', updated_at: now }).eq('user_id', userId)
      }
      return NextResponse.json({ received: true })
    }

    // ── Octroi (achat / renouvellement) ──
    if (GRANTING.has(ev.type)) {
      if (product.kind === 'athlete_sub') {
        await sb.from('user_subscriptions').upsert({
          user_id: userId, tier: product.tier, status: 'active',
          current_period_end: periodEnd, store: 'app_store', provider_sub_id: ev.product_id, updated_at: now,
        }, { onConflict: 'user_id' })
      } else if (product.kind === 'coach_sub') {
        const pack = getCoachPack(product.packKey)
        await sb.from('coach_subscriptions').upsert({
          user_id: userId, pack_key: product.packKey, max_athletes: pack?.maxAthletes ?? null,
          status: 'active', current_period_end: periodEnd, store: 'app_store', provider_sub_id: ev.product_id, updated_at: now,
        }, { onConflict: 'user_id' })
        await sb.from('profiles').update({ coach_subscribed: true }).eq('id', userId)
        // Expérience athlète du coach : premium de base, sauf option pro/expert déjà active (ne pas rétrograder).
        const { data: cur } = await sb.from('user_subscriptions').select('tier').eq('user_id', userId).maybeSingle()
        const keepTier = (cur?.tier === 'pro' || cur?.tier === 'expert') ? cur.tier : athleteTierForCoachTier('premium')
        await sb.from('user_subscriptions').upsert({
          user_id: userId, tier: keepTier, status: 'active',
          current_period_end: periodEnd, store: 'app_store', provider_sub_id: ev.product_id, updated_at: now,
        }, { onConflict: 'user_id' })
      } else if (product.kind === 'coach_addon') {
        // Option coach → relève l'expérience athlète (pro / expert).
        await sb.from('user_subscriptions').upsert({
          user_id: userId, tier: product.tier, status: 'active',
          current_period_end: periodEnd, store: 'app_store', provider_sub_id: ev.product_id, updated_at: now,
        }, { onConflict: 'user_id' })
        await sb.from('coach_subscriptions').update({ included_tier: product.tier, updated_at: now }).eq('user_id', userId)
      }
      return NextResponse.json({ received: true })
    }

    // Autres events (CANCELLATION = auto-renew coupé mais actif jusqu'à échéance,
    // BILLING_ISSUE, etc.) → journalisés, pas d'action immédiate.
    console.log('[revenuecat/webhook] event non traité:', ev.type)
    return NextResponse.json({ received: true })
  } catch (err) {
    console.error('[revenuecat/webhook] erreur:', err instanceof Error ? err.message : err)
    return NextResponse.json({ error: 'internal' }, { status: 500 })
  }
}
