// ══════════════════════════════════════════════════════════════
// STRIPE CONFIG — Client Stripe + mapping Price IDs → tiers
// ══════════════════════════════════════════════════════════════

import Stripe from 'stripe'
import type { TierName } from '@/lib/subscriptions/tier-limits'

// ── Client Stripe (server-only) ────────────────────────────────

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? '', {
  apiVersion: '2024-11-20.acacia',
})

// ── Résolution Price ID → tier ─────────────────────────────────

/**
 * Retourne le tier correspondant à un Price ID Stripe.
 * Défaut → 'premium' si le Price ID n'est pas reconnu.
 */
export function getTierFromPriceId(priceId: string): TierName {
  const map: Record<string, TierName> = {}

  const entries: [string | undefined, TierName][] = [
    [process.env.STRIPE_PRICE_PREMIUM_MONTHLY, 'premium'],
    [process.env.STRIPE_PRICE_PREMIUM_YEARLY,  'premium'],
    [process.env.STRIPE_PRICE_PRO_MONTHLY,     'pro'],
    [process.env.STRIPE_PRICE_PRO_YEARLY,      'pro'],
    [process.env.STRIPE_PRICE_EXPERT_MONTHLY,  'expert'],
    [process.env.STRIPE_PRICE_EXPERT_YEARLY,   'expert'],
  ]

  for (const [id, tier] of entries) {
    if (id) map[id] = tier
  }

  return map[priceId] ?? 'premium'
}

/**
 * Retourne le Price ID Stripe pour un tier + période de facturation.
 * Retourne undefined si la variable d'env correspondante n'est pas définie.
 */
export function getPriceId(
  tier: TierName,
  billingPeriod: 'monthly' | 'yearly',
): string | undefined {
  const key = `STRIPE_PRICE_${tier.toUpperCase()}_${billingPeriod.toUpperCase()}`
  return process.env[key]
}

/**
 * Retourne tous les Price IDs configurés (pour validation).
 */
export function getConfiguredPriceIds(): string[] {
  return [
    process.env.STRIPE_PRICE_PREMIUM_MONTHLY,
    process.env.STRIPE_PRICE_PREMIUM_YEARLY,
    process.env.STRIPE_PRICE_PRO_MONTHLY,
    process.env.STRIPE_PRICE_PRO_YEARLY,
    process.env.STRIPE_PRICE_EXPERT_MONTHLY,
    process.env.STRIPE_PRICE_EXPERT_YEARLY,
  ].filter((id): id is string => typeof id === 'string' && id.length > 0)
}
