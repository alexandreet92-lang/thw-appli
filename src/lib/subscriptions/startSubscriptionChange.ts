// ══════════════════════════════════════════════════════════════
// Point d'entrée UNIQUE « Changer d'abonnement » / « Gérer · Résilier »
// — paiement et gestion DANS l'app, plus aucun lien envoyé par email.
//
//  App iOS (Capacitor) — règle App Store 3.1.1 : aucun prix ni paiement web.
//   • Changer   → boutique d'achat intégré Apple (openIapStore).
//   • Gérer     → selon la SOURCE de l'abonnement actif (/api/subscriptions/
//                 summary → billing) : App Store → réglages d'abonnement
//                 Apple ; souscrit sur le web → portail client Stripe
//                 (lien de GESTION d'un abonnement existant, navigateur
//                 externe). Source indéterminée → choix proposé.
//  Web
//   • Changer   → fenêtre de choix de formule (SubscriptionChangeHost) puis
//                 Stripe Checkout direct (/api/stripe/checkout) — ou bascule
//                 de formule sur l'abonnement existant. Coach → /coach/subscription.
//   • Gérer     → portail client Stripe direct (/api/stripe/portal).
// ══════════════════════════════════════════════════════════════
import { isNativeApp, openExternalUrl } from '@/lib/native/platform'
import { openIapStore } from '@/lib/iap/store-events'
import type { BillingSource, BillingSources } from './billing-source'
import type { AthletePlanTier } from './athlete-plans'
import type { BillingPeriod, CoachPackKey, CoachTier } from './coach-packs'

export type SubscriptionPlanKind = 'athlete' | 'coach'

/** Réglages d'abonnement du compte Apple. */
export const APPLE_SUBSCRIPTIONS_URL = 'https://apps.apple.com/account/subscriptions'

/** Événement écouté par SubscriptionChangeHost. */
export const SUBSCRIPTION_SHEET_EVENT = 'thw:subscription-sheet'

export type SubscriptionSheetDetail =
  | { view: 'plans'; tier?: AthletePlanTier }
  | { view: 'manage'; plan: SubscriptionPlanKind }
  | { view: 'coach-plans' }

function emit(detail: SubscriptionSheetDetail): void {
  window.dispatchEvent(new CustomEvent<SubscriptionSheetDetail>(SUBSCRIPTION_SHEET_EVENT, { detail }))
}

function currentPath(): string {
  if (typeof window === 'undefined') return '/'
  return `${window.location.pathname}${window.location.search}`
}

/**
 * « Changer d'abonnement » depuis n'importe quel écran.
 * Natif → boutique Apple ; web → choix de formule (athlète, `tier`
 * présélectionnée si fournie) ou page des packs coach.
 */
export function openSubscriptionChange(plan: SubscriptionPlanKind = 'athlete', tier?: AthletePlanTier): void {
  if (typeof window === 'undefined') return
  if (isNativeApp()) { openIapStore(plan); return }
  emit(plan === 'coach' ? { view: 'coach-plans' } : { view: 'plans', tier })
}

/**
 * « Gérer / Résilier l'abonnement » depuis n'importe quel écran.
 * La fenêtre (SubscriptionChangeHost) détecte la source puis ouvre Apple ou
 * le portail Stripe ; elle n'affiche du contenu que si un choix est utile.
 */
export function openSubscriptionManage(plan: SubscriptionPlanKind = 'athlete'): void {
  if (typeof window === 'undefined') return
  emit({ view: 'manage', plan })
}

/** 'unknown' = résumé injoignable (réseau / session). */
export type ResolvedBillingSource = BillingSource | 'none' | 'unknown'

/** Source de facturation de l'abonnement ciblé (repli sur l'autre type). */
export async function fetchBillingSource(plan: SubscriptionPlanKind): Promise<ResolvedBillingSource> {
  try {
    const r = await fetch('/api/subscriptions/summary', { cache: 'no-store' })
    if (!r.ok) return 'unknown'
    const j = await r.json() as { billing?: BillingSources }
    if (!j.billing) return 'unknown'
    const own = plan === 'coach' ? j.billing.coach : j.billing.athlete
    const other = plan === 'coach' ? j.billing.athlete : j.billing.coach
    return own ?? other ?? 'none'
  } catch {
    return 'unknown'
  }
}

/** Erreur portail : `noSubscription` = aucun client Stripe pour ce compte (404). */
export class PortalError extends Error {
  constructor(message: string, readonly noSubscription: boolean) { super(message) }
}

/**
 * Ouvre le portail client Stripe (gérer / résilier un abonnement WEB).
 * Natif → navigateur externe (in-app browser) ; web → même onglet.
 */
export async function openStripePortal(): Promise<void> {
  const native = isNativeApp()
  const res = await fetch('/api/stripe/portal', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ return_path: native ? '/settings/subscription' : currentPath() }),
  })
  let json: { url?: string; error?: string } = {}
  try { json = await res.json() as typeof json } catch { /* corps vide */ }
  if (!res.ok || !json.url) throw new PortalError(json.error ?? '', res.status === 404)
  if (native) await openExternalUrl(json.url)
  else window.location.assign(json.url)
}

/** Réglages d'abonnement Apple (natif : navigateur système ; web : nouvel onglet). */
export async function openAppleSubscriptions(): Promise<void> {
  await openExternalUrl(APPLE_SUBSCRIPTIONS_URL)
}

/** Erreur checkout : `code` = 'app_store_managed' | 'same_plan' | null. */
export class CheckoutError extends Error {
  constructor(message: string, readonly code: 'app_store_managed' | 'same_plan' | null) { super(message) }
}

async function postCheckout(body: Record<string, string>): Promise<{ url?: string; updated?: boolean }> {
  const res = await fetch('/api/stripe/checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  let json: { url?: string; updated?: boolean; error?: string } = {}
  try { json = await res.json() as typeof json } catch { /* corps vide */ }
  if (!res.ok) {
    const code = json.error === 'app_store_managed' || json.error === 'same_plan' ? json.error : null
    throw new CheckoutError(code ? '' : json.error ?? '', code)
  }
  return json
}

/**
 * Abonnement ATHLÈTE direct pour l'utilisateur connecté (web).
 * 'redirect' : page Stripe Checkout en cours d'ouverture ;
 * 'updated'  : formule de l'abonnement Stripe existant modifiée sur place ;
 * 'store'    : app iOS → boutique Apple ouverte (jamais de paiement web).
 * Rejette avec CheckoutError ; l'appelant affiche `e.message || t('misc.error')`.
 */
export async function startAthleteCheckout(tier: AthletePlanTier, period: BillingPeriod): Promise<'redirect' | 'updated' | 'store'> {
  if (isNativeApp()) { openIapStore('athlete'); return 'store' }
  const json = await postCheckout({ tier, billingPeriod: period })
  if (json.updated) return 'updated'
  if (!json.url) throw new CheckoutError('', null)
  window.location.assign(json.url)
  return 'redirect'
}

/**
 * Pack COACH direct pour l'utilisateur connecté (web) — Payment Link Stripe
 * avec l'identité du coach. App iOS → boutique Apple (onglet Coach).
 */
export async function startCoachCheckout(pack: CoachPackKey, coachTier: CoachTier, period: BillingPeriod): Promise<'redirect' | 'store'> {
  if (isNativeApp()) { openIapStore('coach'); return 'store' }
  const json = await postCheckout({ coachPack: pack, coachTier, billingPeriod: period })
  if (!json.url) throw new CheckoutError('', null)
  window.location.assign(json.url)
  return 'redirect'
}
