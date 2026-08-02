// ══════════════════════════════════════════════════════════════════
// Packs COACH — catalogue central (capacité d'athlètes + prix + Price IDs).
// Base commune à tous : abonnement athlète Premium pour le coach + TOUTES les
// fonctions coach + ~1 M tokens Studio. Le pack = la capacité d'athlètes gérés.
// Prix annuels = 2 mois offerts (−17 %, soit ×10 le mois).
// ══════════════════════════════════════════════════════════════════

export type CoachPackKey = 'coach10' | 'coach50' | 'coach100' | 'coach200' | 'coach300' | 'coach500'

export type BillingPeriod = 'monthly' | 'yearly'

export interface CoachPack {
  key: CoachPackKey
  name: string          // nom commercial du pack
  label: string         // sous-titre capacité
  maxAthletes: number
  monthlyEur: number
  yearlyEur: number
  /** Tokens Studio mensuels inclus. */
  studioTokens: number
  /** Payment Links Stripe (pages hébergées buy.stripe.com). Publics, non secrets. */
  links: { monthly: string; yearly: string }
}

// Échelle de noms qui raconte la croissance d'une activité de coaching :
// Solo → Équipe → Club → Académie → Élite → Fédération.
export const COACH_PACKS: CoachPack[] = [
  { key: 'coach10',  name: 'Solo',       label: "Jusqu'à 10 athlètes",  maxAthletes: 10,  monthlyEur: 29,  yearlyEur: 290,  studioTokens: 1_000_000,
    links: { monthly: 'https://buy.stripe.com/dRm14o6PhduJ88vaoIf3a1a', yearly: 'https://buy.stripe.com/fZuaEY7Tl1M12Ob7cwf3a1b' } },
  { key: 'coach50',  name: 'Équipe',     label: "Jusqu'à 50 athlètes",  maxAthletes: 50,  monthlyEur: 59,  yearlyEur: 590,  studioTokens: 1_000_000,
    links: { monthly: 'https://buy.stripe.com/00wcN68Xp3U988v68sf3a1c', yearly: 'https://buy.stripe.com/4gM6oIehJ0HXewT8gAf3a1d' } },
  { key: 'coach100', name: 'Club',       label: "Jusqu'à 100 athlètes", maxAthletes: 100, monthlyEur: 99,  yearlyEur: 990,  studioTokens: 1_000_000,
    links: { monthly: 'https://buy.stripe.com/28E7sM6Ph62hbkHaoIf3a1e', yearly: 'https://buy.stripe.com/9B628sb5x4Yd74r2Wgf3a1f' } },
  { key: 'coach200', name: 'Académie',   label: "Jusqu'à 200 athlètes", maxAthletes: 200, monthlyEur: 169, yearlyEur: 1690, studioTokens: 1_000_000,
    links: { monthly: 'https://buy.stripe.com/bJeaEY7Tl0HXfAXcwQf3a1g', yearly: 'https://buy.stripe.com/8x2fZi2z1aix9cz54of3a1h' } },
  { key: 'coach300', name: 'Élite',      label: "Jusqu'à 300 athlètes", maxAthletes: 300, monthlyEur: 229, yearlyEur: 2290, studioTokens: 1_000_000,
    links: { monthly: 'https://buy.stripe.com/bJecN60qT1M13SfdAUf3a1i', yearly: 'https://buy.stripe.com/4gM14o3D5eyNdsPaoIf3a1j' } },
  { key: 'coach500', name: 'Fédération', label: "Jusqu'à 500 athlètes", maxAthletes: 500, monthlyEur: 349, yearlyEur: 3490, studioTokens: 1_000_000,
    links: { monthly: 'https://buy.stripe.com/bJefZi5Ld4Yd60n8gAf3a1k', yearly: 'https://buy.stripe.com/dRm3cwflNgGV60n1Scf3a1l' } },
]

export function getCoachPack(key: string | null | undefined): CoachPack | null {
  return COACH_PACKS.find(p => p.key === key) ?? null
}

/**
 * URL du Payment Link Stripe pour un pack + période, avec l'identité du coach
 * attachée en `client_reference_id` (retrouvée par le webhook) et l'email
 * pré-rempli. Le lien fixe lui-même le prix : la période/pack n'est donc JAMAIS
 * dérivée de l'URL côté serveur — le webhook la re-dérive du montant réellement payé.
 */
export function buildCoachPackCheckoutUrl(
  key: CoachPackKey,
  period: BillingPeriod,
  userId: string,
  email?: string | null,
): string | null {
  const pack = getCoachPack(key)
  if (!pack) return null
  // Override possible par variable d'env (ex. changement de lien sans redéploiement).
  const envKey = `STRIPE_LINK_${key.toUpperCase()}_${period.toUpperCase()}`
  const base = process.env[envKey] || pack.links[period]
  if (!base) return null
  const url = new URL(base)
  url.searchParams.set('client_reference_id', userId)
  if (email) url.searchParams.set('prefilled_email', email)
  return url.toString()
}

/** Montant unitaire (centimes) attendu pour un pack + période. */
function packAmountCents(pack: CoachPack, period: BillingPeriod): number {
  return (period === 'yearly' ? pack.yearlyEur : pack.monthlyEur) * 100
}

/**
 * Retrouve le pack coach à partir du MONTANT réellement facturé par Stripe
 * (source de vérité non falsifiable, contrairement à l'URL). `interval` provient
 * de `price.recurring.interval` ('month' | 'year').
 */
export function getCoachPackFromAmount(
  unitAmountCents: number | null | undefined,
  interval: string | null | undefined,
): { pack: CoachPack; period: BillingPeriod } | null {
  if (!unitAmountCents) return null
  const period: BillingPeriod = interval === 'year' ? 'yearly' : 'monthly'
  const pack = COACH_PACKS.find(p => packAmountCents(p, period) === unitAmountCents)
  return pack ? { pack, period } : null
}

/** Nom de variable d'env du Price ID Stripe pour un pack + période (héritage). */
export function coachPackEnvKey(key: CoachPackKey, period: BillingPeriod): string {
  // ex. STRIPE_PRICE_COACH10_MONTHLY
  return `STRIPE_PRICE_${key.toUpperCase()}_${period.toUpperCase()}`
}

/** Price ID Stripe configuré pour un pack + période (undefined si non défini). */
export function getCoachPackPriceId(key: CoachPackKey, period: BillingPeriod): string | undefined {
  return process.env[coachPackEnvKey(key, period)]
}

/**
 * Pack correspondant à un Price ID Stripe (null si non configuré / pas un pack).
 * Conservé pour compat : les Payment Links s'appuient plutôt sur le montant.
 */
export function getCoachPackFromPriceId(priceId: string): CoachPack | null {
  for (const p of COACH_PACKS) {
    if (process.env[coachPackEnvKey(p.key, 'monthly')] === priceId) return p
    if (process.env[coachPackEnvKey(p.key, 'yearly')] === priceId) return p
  }
  return null
}
