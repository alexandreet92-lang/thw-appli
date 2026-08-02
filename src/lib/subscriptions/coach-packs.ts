// ══════════════════════════════════════════════════════════════════
// Packs COACH — catalogue central (capacité d'athlètes + prix + Price IDs).
// Base commune à tous : abonnement athlète Premium pour le coach + TOUTES les
// fonctions coach + ~1 M tokens Studio. Le pack = la capacité d'athlètes gérés.
// Prix annuels = 2 mois offerts (−17 %, soit ×10 le mois).
// ══════════════════════════════════════════════════════════════════

export type CoachPackKey = 'coach10' | 'coach50' | 'coach100' | 'coach200' | 'coach300' | 'coach500'

export interface CoachPack {
  key: CoachPackKey
  label: string
  maxAthletes: number
  monthlyEur: number
  yearlyEur: number
  /** Tokens Studio mensuels inclus. */
  studioTokens: number
}

export const COACH_PACKS: CoachPack[] = [
  { key: 'coach10',  label: "Jusqu'à 10 athlètes",  maxAthletes: 10,  monthlyEur: 29,  yearlyEur: 290,  studioTokens: 1_000_000 },
  { key: 'coach50',  label: "Jusqu'à 50 athlètes",  maxAthletes: 50,  monthlyEur: 59,  yearlyEur: 590,  studioTokens: 1_000_000 },
  { key: 'coach100', label: "Jusqu'à 100 athlètes", maxAthletes: 100, monthlyEur: 99,  yearlyEur: 990,  studioTokens: 1_000_000 },
  { key: 'coach200', label: "Jusqu'à 200 athlètes", maxAthletes: 200, monthlyEur: 169, yearlyEur: 1690, studioTokens: 1_000_000 },
  { key: 'coach300', label: "Jusqu'à 300 athlètes", maxAthletes: 300, monthlyEur: 229, yearlyEur: 2290, studioTokens: 1_000_000 },
  { key: 'coach500', label: "Jusqu'à 500 athlètes", maxAthletes: 500, monthlyEur: 349, yearlyEur: 3490, studioTokens: 1_000_000 },
]

export function getCoachPack(key: string | null | undefined): CoachPack | null {
  return COACH_PACKS.find(p => p.key === key) ?? null
}

/** Nom de variable d'env du Price ID Stripe pour un pack + période. */
export function coachPackEnvKey(key: CoachPackKey, period: 'monthly' | 'yearly'): string {
  // ex. STRIPE_PRICE_COACH10_MONTHLY
  return `STRIPE_PRICE_${key.toUpperCase()}_${period.toUpperCase()}`
}

/** Price ID Stripe configuré pour un pack + période (undefined si non défini). */
export function getCoachPackPriceId(key: CoachPackKey, period: 'monthly' | 'yearly'): string | undefined {
  return process.env[coachPackEnvKey(key, period)]
}

/** Pack correspondant à un Price ID Stripe (null si ce n'est pas un pack coach). */
export function getCoachPackFromPriceId(priceId: string): CoachPack | null {
  for (const p of COACH_PACKS) {
    if (process.env[coachPackEnvKey(p.key, 'monthly')] === priceId) return p
    if (process.env[coachPackEnvKey(p.key, 'yearly')] === priceId) return p
  }
  return null
}
