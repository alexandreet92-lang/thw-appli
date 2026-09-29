// ══════════════════════════════════════════════════════════════
// Mapping des produits d'achat in-app (Apple / RevenueCat) → sémantique
// interne (tier athlète, pack coach, option, tokens).
//
// Les identifiants DOIVENT correspondre EXACTEMENT à ceux créés dans
// App Store Connect (voir docs/IAP_SETUP.md). Le prix vit dans App Store
// Connect ; ici on ne mappe que l'ACCÈS accordé.
// ══════════════════════════════════════════════════════════════

import type { CoachPackKey, BillingPeriod } from '@/lib/subscriptions/coach-packs'

export type AthleteTier = 'premium' | 'pro' | 'expert'

export type IapProduct =
  | { kind: 'athlete_sub'; tier: AthleteTier; period: BillingPeriod }
  | { kind: 'coach_sub'; packKey: CoachPackKey; period: BillingPeriod }
  | { kind: 'coach_addon'; tier: 'pro' | 'expert' }   // upgrade niveau athlète du coach
  | { kind: 'tokens'; amount: number }

// Étiquette commerciale coach → clé interne du pack (capacité).
const COACH_LABEL_TO_KEY: Record<string, CoachPackKey> = {
  solo: 'coach10', team: 'coach50', club: 'coach100',
  academy: 'coach200', elite: 'coach300', federation: 'coach500',
}

const TOKEN_AMOUNTS: Record<string, number> = {
  tokens_100k: 100_000,
  tokens_500k: 500_000,
  tokens_1m: 1_000_000,
}

/** Parse un identifiant de produit IAP en sémantique interne, sinon null. */
export function parseIapProduct(productId: string): IapProduct | null {
  const id = (productId || '').trim().toLowerCase()

  // Tokens (consommables)
  if (id in TOKEN_AMOUNTS) return { kind: 'tokens', amount: TOKEN_AMOUNTS[id] }

  // Options coach (upgrade niveau athlète)
  if (id === 'coach_addon_athlete_pro_monthly') return { kind: 'coach_addon', tier: 'pro' }
  if (id === 'coach_addon_athlete_expert_monthly') return { kind: 'coach_addon', tier: 'expert' }

  // Abonnement athlète : athlete_<tier>_<period>
  const aMatch = id.match(/^athlete_(premium|pro|expert)_(monthly|yearly)$/)
  if (aMatch) return { kind: 'athlete_sub', tier: aMatch[1] as AthleteTier, period: aMatch[2] as BillingPeriod }

  // Abonnement coach : coach_<label>_<period>
  const cMatch = id.match(/^coach_(solo|team|club|academy|elite|federation)_(monthly|yearly)$/)
  if (cMatch) {
    const packKey = COACH_LABEL_TO_KEY[cMatch[1]]
    if (packKey) return { kind: 'coach_sub', packKey, period: cMatch[2] as BillingPeriod }
  }

  return null
}

/** Tous les identifiants de produits attendus (pour la doc / le contrôle). */
export const ALL_IAP_PRODUCT_IDS: string[] = [
  ...(['premium', 'pro', 'expert'] as const).flatMap(t => [`athlete_${t}_monthly`, `athlete_${t}_yearly`]),
  ...(['solo', 'team', 'club', 'academy', 'elite', 'federation'] as const).flatMap(l => [`coach_${l}_monthly`, `coach_${l}_yearly`]),
  'coach_addon_athlete_pro_monthly', 'coach_addon_athlete_expert_monthly',
  'tokens_100k', 'tokens_500k', 'tokens_1m',
]
