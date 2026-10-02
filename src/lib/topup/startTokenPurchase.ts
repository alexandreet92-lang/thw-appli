// ══════════════════════════════════════════════════════════════
// Point d'entrée UNIQUE « Acheter des tokens » — paiement DANS l'app,
// plus aucun lien envoyé par email.
//
//  • App iOS (Capacitor) : boutique d'achat intégré Apple, onglet Tokens
//    (openIapStore('tokens') → IapStoreHost / RevenueCat). Règle App Store
//    3.1.1 : aucun lien de paiement externe pour des biens numériques.
//  • Web : paiement Stripe direct pour l'utilisateur connecté
//    (/api/topup/checkout ou /api/studio/checkout) puis redirection vers
//    la page Stripe Checkout. Le crédit est fait par les webhooks existants.
// ══════════════════════════════════════════════════════════════
import { isNativeApp } from '@/lib/native/platform'
import { openIapStore } from '@/lib/iap/store-events'
import type { StudioPackKey } from '@/lib/studio/offers'
import type { TokenPackId } from './packs'

/** Événement écouté par TokenPurchaseHost (fenêtre de choix du pack, web). */
export const TOKEN_PURCHASE_EVENT = 'thw:token-purchase'

/**
 * Ouvre l'achat de tokens depuis n'importe quel écran.
 * Natif → boutique Apple (onglet Tokens) ; web → fenêtre de choix du pack.
 */
export function openTokenPurchase(): void {
  if (typeof window === 'undefined') return
  if (isNativeApp()) { openIapStore('tokens'); return }
  window.dispatchEvent(new CustomEvent(TOKEN_PURCHASE_EVENT))
}

function currentPath(): string {
  if (typeof window === 'undefined') return '/'
  return `${window.location.pathname}${window.location.search}`
}

async function redirectToCheckout(endpoint: string, body: Record<string, string>): Promise<void> {
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  let json: { checkout_url?: string; url?: string; error?: string } = {}
  try { json = await res.json() as typeof json } catch { /* corps vide */ }
  const url = json.checkout_url ?? json.url
  if (!res.ok || !url) throw new Error(json.error ?? '')
  window.location.assign(url)
}

/**
 * Achat direct d'un pack de tokens (chat IA).
 * Rejette avec un Error (message serveur, éventuellement vide) en cas d'échec ;
 * l'appelant affiche `e.message || t('misc.error')`.
 */
export async function startTokenPurchase(packId: TokenPackId): Promise<void> {
  if (isNativeApp()) { openIapStore('tokens'); return }
  await redirectToCheckout('/api/topup/checkout', { pack_id: packId, return_path: currentPath() })
}

/**
 * Achat direct d'un pack de tokens STUDIO.
 * Natif : il n'existe pas (encore) de produit Apple dédié au Studio — on ouvre
 * la boutique Apple sur l'onglet Tokens (seul achat intégré disponible).
 */
export async function startStudioPackPurchase(pack: StudioPackKey): Promise<void> {
  if (isNativeApp()) { openIapStore('tokens'); return }
  await redirectToCheckout('/api/studio/checkout', { pack })
}
