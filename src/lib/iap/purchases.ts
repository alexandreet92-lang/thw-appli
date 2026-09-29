'use client'
// ══════════════════════════════════════════════════════════════
// Achat in-app (RevenueCat) — enveloppe CLIENT, iOS natif uniquement.
// Sur le web, toutes les fonctions sont no-op (le web reste sur Stripe).
// Import dynamique du plugin → le bundle web n'est pas impacté.
// ══════════════════════════════════════════════════════════════

import { isNativeApp } from '@/lib/native/platform'

let configured = false

async function rc() {
  return import('@revenuecat/purchases-capacitor')
}

/** Configure RevenueCat et rattache l'utilisateur (appUserID = id Supabase).
 *  À appeler au démarrage / après connexion. No-op hors app native. */
export async function initIap(userId: string): Promise<void> {
  if (!isNativeApp() || !userId) return
  const apiKey = process.env.NEXT_PUBLIC_REVENUECAT_IOS_KEY
  if (!apiKey) { console.warn('[iap] NEXT_PUBLIC_REVENUECAT_IOS_KEY manquante'); return }
  try {
    const { Purchases, LOG_LEVEL } = await rc()
    if (!configured) {
      try { await Purchases.setLogLevel({ level: LOG_LEVEL.WARN }) } catch { /* optionnel */ }
      await Purchases.configure({ apiKey, appUserID: userId })
      configured = true
    } else {
      await Purchases.logIn({ appUserID: userId })
    }
  } catch (e) {
    console.error('[iap] init:', e instanceof Error ? e.message : e)
  }
}

interface StoreProductLike { identifier: string; priceString: string }

/** Prix formatés (« 14,99 € ») par identifiant de produit, pour l'affichage. */
export async function iapPrices(ids: string[]): Promise<Record<string, string>> {
  const out: Record<string, string> = {}
  if (!isNativeApp() || ids.length === 0) return out
  try {
    const { Purchases } = await rc()
    const res = await Purchases.getProducts({ productIdentifiers: ids })
    const products = (res as { products?: StoreProductLike[] }).products ?? []
    for (const p of products) out[p.identifier] = p.priceString
  } catch (e) {
    console.error('[iap] getProducts:', e instanceof Error ? e.message : e)
  }
  return out
}

export interface IapResult { ok: boolean; cancelled?: boolean; error?: string }

/** Déclenche l'achat Apple d'un produit (feuille système). No-op hors natif. */
export async function buyIap(productId: string): Promise<IapResult> {
  if (!isNativeApp()) return { ok: false, error: 'Achat disponible uniquement dans l’app iOS.' }
  try {
    const { Purchases } = await rc()
    const res = await Purchases.getProducts({ productIdentifiers: [productId] })
    const product = ((res as { products?: StoreProductLike[] }).products ?? [])[0]
    if (!product) return { ok: false, error: 'Produit introuvable.' }
    await Purchases.purchaseStoreProduct({ product: product as unknown as Parameters<typeof Purchases.purchaseStoreProduct>[0]['product'] })
    return { ok: true }
  } catch (e) {
    const err = e as { code?: string; message?: string; userCancelled?: boolean }
    if (err?.userCancelled || err?.code === 'PURCHASE_CANCELLED_ERROR' || /cancel/i.test(err?.message ?? '')) {
      return { ok: false, cancelled: true }
    }
    return { ok: false, error: err?.message ?? 'Achat impossible.' }
  }
}

/** Restaure les achats (obligatoire Apple). Renvoie true si l'appel a abouti. */
export async function restoreIap(): Promise<boolean> {
  if (!isNativeApp()) return false
  try {
    const { Purchases } = await rc()
    await Purchases.restorePurchases()
    return true
  } catch (e) {
    console.error('[iap] restore:', e instanceof Error ? e.message : e)
    return false
  }
}
