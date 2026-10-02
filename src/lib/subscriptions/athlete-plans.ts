// ══════════════════════════════════════════════════════════════
// Formules ATHLÈTE vendues sur le web (Stripe) — mêmes paliers et prix
// que la grille de /settings/subscription. Les Price IDs Stripe restent
// côté serveur (getPriceId) ; ces montants ne servent qu'à l'affichage.
// Jamais affichés dans l'app iOS (achat intégré Apple, prix App Store).
// ══════════════════════════════════════════════════════════════

export type AthletePlanTier = 'premium' | 'pro' | 'expert'

export interface AthletePlan {
  tier: AthletePlanTier
  name: string
  monthlyEur: number
  yearlyEur: number
  /** Clé i18n du sous-titre (existante). */
  subtitleKey: string
}

export const ATHLETE_PLANS: AthletePlan[] = [
  { tier: 'premium', name: 'Premium', monthlyEur: 14, yearlyEur: 132, subtitleKey: 'misc.planPremiumSubtitle' },
  { tier: 'pro',     name: 'Pro',     monthlyEur: 26, yearlyEur: 249, subtitleKey: 'misc.planProSubtitle' },
  { tier: 'expert',  name: 'Expert',  monthlyEur: 49, yearlyEur: 468, subtitleKey: 'misc.planExpertSubtitle' },
]

/** Formule mise en avant par défaut. */
export const DEFAULT_ATHLETE_PLAN: AthletePlanTier = 'pro'

export function isAthletePlanTier(v: unknown): v is AthletePlanTier {
  return v === 'premium' || v === 'pro' || v === 'expert'
}
