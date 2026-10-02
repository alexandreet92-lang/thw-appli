// ══════════════════════════════════════════════════════════════
// Packs de tokens (chat IA) — définition UNIQUE partagée client/serveur.
// Aucun secret ici. Utilisée par :
//  • /api/topup/checkout        (achat direct, utilisateur connecté)
//  • /api/topup/create-checkout (ancien parcours /topup?session=…)
//  • la fenêtre d'achat web (TokenPurchaseHost)
// Côté app iOS, les mêmes volumes sont vendus en achat intégré Apple
// (IAP_TOKEN_PRODUCTS, src/lib/iap/products.ts) — prix fixés par Apple.
// ══════════════════════════════════════════════════════════════

export type TokenPackId = 'discovery' | 'performance' | 'elite'

export interface TokenPack {
  id: TokenPackId
  /** Tokens crédités sur user_token_wallet.bonus_tokens. */
  tokens: number
  /** Prix en centimes d'euro (Stripe). */
  priceCents: number
  /** Libellé Stripe (reçu / page de paiement). */
  stripeName: string
  /** Identifiant du produit Apple équivalent. */
  iapProductId: string
}

export const TOKEN_PACKS: readonly TokenPack[] = [
  { id: 'discovery',   tokens: 100_000,   priceCents: 400,  stripeName: 'Pack Découverte 100k tokens',  iapProductId: 'tokens_100k' },
  { id: 'performance', tokens: 500_000,   priceCents: 1500, stripeName: 'Pack Performance 500k tokens', iapProductId: 'tokens_500k' },
  { id: 'elite',       tokens: 1_000_000, priceCents: 2500, stripeName: 'Pack Elite 1M tokens',         iapProductId: 'tokens_1m' },
]

export const DEFAULT_TOKEN_PACK: TokenPackId = 'performance'

export function getTokenPack(id: unknown): TokenPack | null {
  return TOKEN_PACKS.find(p => p.id === id) ?? null
}
