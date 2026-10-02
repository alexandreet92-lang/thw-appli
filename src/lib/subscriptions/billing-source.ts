// ══════════════════════════════════════════════════════════════
// Source de facturation d'un abonnement (pur, partagé serveur / client).
//
//  • 'app_store' : acheté en achat intégré Apple (RevenueCat pose
//                  store = 'app_store') → géré / résilié chez Apple.
//  • 'stripe'    : souscrit sur le web → géré / résilié via le portail
//                  client Stripe.
//  • null        : aucun abonnement payant connu.
// ══════════════════════════════════════════════════════════════

export type BillingSource = 'stripe' | 'app_store'

export interface BillingSources {
  athlete: BillingSource | null
  coach: BillingSource | null
}

export interface BillingRow {
  store?: string | null
  stripe_subscription_id?: string | null
  stripe_customer_id?: string | null
}

/**
 * Déduit la source d'une ligne user_subscriptions / coach_subscriptions.
 * `customerIsProof` : pour les packs coach (Payment Link), le customer Stripe
 * n'est posé que par le webhook après paiement → c'est une preuve suffisante.
 * Pour l'athlète, le customer est pré-créé AVANT paiement : seul
 * stripe_subscription_id prouve un abonnement réel.
 */
export function billingSourceOf(row: BillingRow | null | undefined, customerIsProof = false): BillingSource | null {
  if (!row) return null
  if (row.store === 'app_store') return 'app_store'
  if (row.stripe_subscription_id) return 'stripe'
  if (customerIsProof && row.stripe_customer_id) return 'stripe'
  return null
}
