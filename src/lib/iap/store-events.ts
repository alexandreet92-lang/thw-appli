// Ouverture de la boutique d'achat in-app (feuille Apple) depuis n'importe où.
// Un seul hôte (IapStoreHost) est monté dans le shell et écoute cet événement.

export type IapStoreTab = 'athlete' | 'coach' | 'tokens'

const EVT = 'thw:iap-store'

/** Ouvre la boutique in-app sur l'onglet demandé. No-op côté serveur. */
export function openIapStore(tab: IapStoreTab = 'athlete'): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent<{ tab: IapStoreTab }>(EVT, { detail: { tab } }))
}

export const IAP_STORE_EVENT = EVT
