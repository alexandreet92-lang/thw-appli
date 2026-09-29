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
  | { kind: 'coach_sub'; packKey: CoachPackKey; tier: AthleteTier; period: BillingPeriod }
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

  // Abonnement athlète : athlete_<tier>_<period>
  const aMatch = id.match(/^athlete_(premium|pro|expert)_(monthly|yearly)$/)
  if (aMatch) return { kind: 'athlete_sub', tier: aMatch[1] as AthleteTier, period: aMatch[2] as BillingPeriod }

  // Abonnement coach : coach_<label>[_<tier>]_<period>
  // Le niveau athlète inclus (l'« option ») est INTÉGRÉ à l'abonnement coach :
  //  - coach_solo_monthly           → premium (base)
  //  - coach_solo_pro_monthly       → pro
  //  - coach_solo_expert_monthly    → expert
  const cMatch = id.match(/^coach_(solo|team|club|academy|elite|federation)(?:_(pro|expert))?_(monthly|yearly)$/)
  if (cMatch) {
    const packKey = COACH_LABEL_TO_KEY[cMatch[1]]
    const tier: AthleteTier = (cMatch[2] as 'pro' | 'expert' | undefined) ?? 'premium'
    if (packKey) return { kind: 'coach_sub', packKey, tier, period: cMatch[3] as BillingPeriod }
  }

  return null
}

/** Tous les identifiants de produits attendus (pour la doc / le contrôle). */
export const ALL_IAP_PRODUCT_IDS: string[] = [
  ...(['premium', 'pro', 'expert'] as const).flatMap(t => [`athlete_${t}_monthly`, `athlete_${t}_yearly`]),
  // Coach : solo/team/club (les gros paliers restent web) × premium(base)/pro/expert × mensuel/annuel
  ...(['solo', 'team', 'club'] as const).flatMap(l => [
    `coach_${l}_monthly`, `coach_${l}_yearly`,
    `coach_${l}_pro_monthly`, `coach_${l}_pro_yearly`,
    `coach_${l}_expert_monthly`, `coach_${l}_expert_yearly`,
  ]),
  'tokens_100k', 'tokens_500k', 'tokens_1m',
]
