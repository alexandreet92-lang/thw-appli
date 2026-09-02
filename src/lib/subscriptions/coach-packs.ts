// ══════════════════════════════════════════════════════════════════
// Packs COACH — catalogue central (capacité d'athlètes + prix + Price IDs).
// Chaque pack existe en 2 formules qui DÉBLOQUENT l'abonnement athlète du coach :
//   • « Pro »    → le coach a les fonctions Athlète Pro
//   • « Expert » → le coach a les fonctions Athlète Expert
// (Un coach a donc TOUJOURS un abonnement athlète : c'est inclus dans le pack.)
// Le pack = la capacité d'athlètes gérés ; la formule = le niveau athlète du coach.
// Prix annuels = 2 mois offerts (≈ ×10 le mois).
//
// ⚠️ Les PRIX affichés ci-dessous doivent correspondre à ceux réglés dans Stripe.
//    Le webhook, lui, identifie le pack par le PRICE ID (unique) → aucun risque
//    d'ambiguïté même si deux formules ont le même prix.
// ══════════════════════════════════════════════════════════════════

export type CoachPackKey = 'coach10' | 'coach50' | 'coach100' | 'coach200' | 'coach300' | 'coach500'
export type BillingPeriod = 'monthly' | 'yearly'
/** Niveau athlète inclus dans le pack coach : Premium (inclus de base), Pro ou Expert. */
export type CoachTier = 'premium' | 'pro' | 'expert'

export interface CoachTierVariant {
  monthlyEur: number
  yearlyEur: number
  /** Payment Links Stripe (buy.stripe.com) — publics, non secrets. */
  links: { monthly: string; yearly: string }
  /** Price IDs Stripe (price_…) — servent au webhook pour attribuer le bon accès. */
  priceIds: { monthly: string; yearly: string }
}

export interface CoachPack {
  key: CoachPackKey
  name: string          // nom commercial du pack (capacité)
  label: string         // sous-titre capacité
  maxAthletes: number
  studioTokens: number  // tokens Studio mensuels inclus
  tiers: Record<CoachTier, CoachTierVariant>
}

const B = 'https://buy.stripe.com/'

// Solo → Équipe → Club → Académie → Élite → Fédération.
export const COACH_PACKS: CoachPack[] = [
  { key: 'coach10', name: 'Solo', label: "Jusqu'à 10 athlètes", maxAthletes: 10, studioTokens: 1_000_000, tiers: {
    premium: { monthlyEur: 29,  yearlyEur: 290,  links: { monthly: B+'bJe5kE1uXaixdsPeEYf3a1m', yearly: B+'7sY7sMehJbmBdsP9kEf3a1n' }, priceIds: { monthly: '', yearly: '' } },
    pro:    { monthlyEur: 49,  yearlyEur: 490,  links: { monthly: B+'5kQ00kgpRcqFbkH54of3a1y', yearly: B+'14AdRa6Ph8ap3Sf40kf3a1z' }, priceIds: { monthly: 'price_1UB9mLKCReSaFnASOEHrIwYD', yearly: 'price_1UB9mqKCReSaFnAS7DlpmCWs' } },
    expert: { monthlyEur: 69,  yearlyEur: 690,  links: { monthly: B+'5kQ3cw2z19etfAX1Scf3a1L', yearly: B+'fZu5kEa1tfCRdsP1Scf3a1M' }, priceIds: { monthly: 'price_1UB9rjKCReSaFnASizaUoBAC', yearly: 'price_1UB9s6KCReSaFnASEZRDgkLu' } } } },
  { key: 'coach50', name: 'Équipe', label: "Jusqu'à 50 athlètes", maxAthletes: 50, studioTokens: 1_000_000, tiers: {
    premium: { monthlyEur: 59,  yearlyEur: 590,  links: { monthly: B+'bJe9AU7Tl76lgF1aoIf3a1o', yearly: B+'3cIfZigpR62hcoL1Scf3a1p' }, priceIds: { monthly: '', yearly: '' } },
    pro:    { monthlyEur: 79,  yearlyEur: 790,  links: { monthly: B+'28E9AU1uX9etgF1bsMf3a1A', yearly: B+'dRmdRaddF76l3SfbsMf3a1B' }, priceIds: { monthly: 'price_1UB9nMKCReSaFnAS5U1Ec44c', yearly: 'price_1UB9nfKCReSaFnASdMMRUIcd' } },
    expert: { monthlyEur: 99,  yearlyEur: 990,  links: { monthly: B+'8x228s4H9cqFewT68sf3a1N', yearly: B+'9B6bJ2gpRbmB0G31Scf3a1O' }, priceIds: { monthly: 'price_1UB9sVKCReSaFnASJf6uzrY3', yearly: 'price_1UB9sqKCReSaFnASJEQ3F0AG' } } } },
  { key: 'coach100', name: 'Club', label: "Jusqu'à 100 athlètes", maxAthletes: 100, studioTokens: 1_000_000, tiers: {
    premium: { monthlyEur: 99,  yearlyEur: 990,  links: { monthly: B+'fZu14oflN2Q52ObeEYf3a1q', yearly: B+'00w14oflN1M1dsP68sf3a1r' }, priceIds: { monthly: '', yearly: '' } },
    pro:    { monthlyEur: 119, yearlyEur: 1190, links: { monthly: B+'5kQ5kEc9B3U94Wj9kEf3a1C', yearly: B+'aFafZi8XpaixgF1bsMf3a1D' }, priceIds: { monthly: 'price_1UB9o2KCReSaFnAStXp2ooIh', yearly: 'price_1UB9oWKCReSaFnASY2Qhh67Y' } },
    expert: { monthlyEur: 139, yearlyEur: 1390, links: { monthly: B+'bJe00kddF1M1bkH68sf3a1P', yearly: B+'5kQ00k7TlfCRfAX54of3a1Q' }, priceIds: { monthly: 'price_1UB9tSKCReSaFnASpc4QuhKv', yearly: 'price_1UB9twKCReSaFnASo2FXCaxE' } } } },
  { key: 'coach200', name: 'Académie', label: "Jusqu'à 200 athlètes", maxAthletes: 200, studioTokens: 1_000_000, tiers: {
    premium: { monthlyEur: 169, yearlyEur: 1690, links: { monthly: B+'bJe5kEa1t4Yd2Ob0O8f3a1s', yearly: B+'7sY7sM4H92Q5agDeEYf3a1t' }, priceIds: { monthly: '', yearly: '' } },
    pro:    { monthlyEur: 189, yearlyEur: 1890, links: { monthly: B+'fZueVe6Phaix88vcwQf3a1E', yearly: B+'cNibJ27TlbmBfAX9kEf3a1H' }, priceIds: { monthly: 'price_1UB9pUKCReSaFnASbNWaY7zC', yearly: 'price_1UBAI7KCReSaFnAS5pbu9fEz' } },
    expert: { monthlyEur: 209, yearlyEur: 2090, links: { monthly: B+'aFa00kehJ76l88v40kf3a1R', yearly: B+'dRm14oflN1M14WjfJ2f3a1S' }, priceIds: { monthly: 'price_1UB9uPKCReSaFnASdsEOXRyh', yearly: 'price_1UB9unKCReSaFnASCrBkBDu1' } } } },
  { key: 'coach300', name: 'Élite', label: "Jusqu'à 300 athlètes", maxAthletes: 300, studioTokens: 1_000_000, tiers: {
    premium: { monthlyEur: 229, yearlyEur: 2290, links: { monthly: B+'aFadRagpR3U960nfJ2f3a1u', yearly: B+'3cI8wQc9BbmBgF154of3a1v' }, priceIds: { monthly: '', yearly: '' } },
    pro:    { monthlyEur: 249, yearlyEur: 2490, links: { monthly: B+'5kQ28s2z18ap74rgN6f3a1G', yearly: B+'aFa28sc9B3U9ewTcwQf3a1I' }, priceIds: { monthly: 'price_1UB9q5KCReSaFnASVcMdElL8', yearly: 'price_1UBAJ7KCReSaFnASPtB9BJ9x' } },
    expert: { monthlyEur: 269, yearlyEur: 2690, links: { monthly: B+'4gM00k5Ld3U974r1Scf3a1T', yearly: B+'6oU00kehJduJfAX1Scf3a1U' }, priceIds: { monthly: 'price_1UB9vOKCReSaFnASBLxOMg0U', yearly: 'price_1UB9vnKCReSaFnAS73rNFzZh' } } } },
  { key: 'coach500', name: 'Fédération', label: "Jusqu'à 500 athlètes", maxAthletes: 500, studioTokens: 1_000_000, tiers: {
    premium: { monthlyEur: 349, yearlyEur: 3490, links: { monthly: B+'14A28s8XpbmB1K7bsMf3a1w', yearly: B+'14A8wQ8XpfCRagD2Wgf3a1x' }, priceIds: { monthly: '', yearly: '' } },
    pro:    { monthlyEur: 369, yearlyEur: 3690, links: { monthly: B+'cNicN68Xp9et0G38gAf3a1J', yearly: B+'28EdRa8Xp4YdgF1fJ2f3a1K' }, priceIds: { monthly: 'price_1UB9qlKCReSaFnASOiBa1ONF', yearly: 'price_1UB9rEKCReSaFnASfMxUGbML' } },
    expert: { monthlyEur: 389, yearlyEur: 3890, links: { monthly: B+'cNi8wQ5Ld2Q52Ob7cwf3a1V', yearly: B+'eVq28s1uXcqFfAXfJ2f3a1W' }, priceIds: { monthly: 'price_1UB9wAKCReSaFnAS2OhLdE66', yearly: 'price_1UB9woKCReSaFnASXheNMTL9' } } } },
]

export function getCoachPack(key: string | null | undefined): CoachPack | null {
  return COACH_PACKS.find(p => p.key === key) ?? null
}

/** Prix (€) d'un pack pour une formule + période. */
export function coachPackPriceEur(pack: CoachPack, tier: CoachTier, period: BillingPeriod): number {
  const v = pack.tiers[tier]
  return period === 'yearly' ? v.yearlyEur : v.monthlyEur
}

/**
 * URL du Payment Link Stripe pour un pack + formule + période, avec l'identité
 * du coach en `client_reference_id` (retrouvée par le webhook) et l'email
 * pré-rempli.
 */
export function buildCoachPackCheckoutUrl(
  key: CoachPackKey,
  tier: CoachTier,
  period: BillingPeriod,
  userId: string,
  email?: string | null,
): string | null {
  const pack = getCoachPack(key)
  if (!pack) return null
  const base = pack.tiers[tier].links[period]
  if (!base) return null
  const url = new URL(base)
  url.searchParams.set('client_reference_id', userId)
  if (email) url.searchParams.set('prefilled_email', email)
  return url.toString()
}

/**
 * Retrouve pack + formule + période à partir d'un PRICE ID Stripe (source de
 * vérité UNIQUE, non ambiguë). Utilisé par le webhook pour attribuer le bon
 * accès (capacité d'athlètes + niveau athlète Pro/Expert du coach).
 */
export function getCoachPackByPriceId(
  priceId: string | null | undefined,
): { pack: CoachPack; tier: CoachTier; period: BillingPeriod } | null {
  if (!priceId) return null
  for (const pack of COACH_PACKS) {
    for (const tier of ['premium', 'pro', 'expert'] as CoachTier[]) {
      const ids = pack.tiers[tier].priceIds
      // On ignore les Price IDs vides (formule pas encore reliée à Stripe).
      if (ids.monthly && ids.monthly === priceId) return { pack, tier, period: 'monthly' }
      if (ids.yearly && ids.yearly === priceId) return { pack, tier, period: 'yearly' }
    }
  }
  return null
}

/** Niveau d'abonnement ATHLÈTE débloqué pour le coach selon la formule du pack. */
export function athleteTierForCoachTier(tier: CoachTier): 'premium' | 'pro' | 'expert' {
  return tier
}
