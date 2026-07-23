// ══════════════════════════════════════════════════════════════
// STUDIO — offre commerciale (partagé client/serveur, AUCUN secret ici).
// ──────────────────────────────────────────────────────────────
// Accès : le Studio est réservé aux abonnements Pro et Expert (le coût
// IA d'un run multi-agents est sans commune mesure avec le chat).
// Chaque tier inclut un quota MENSUEL de tokens Studio, séparé du quota
// chat. Au-delà : 3 packs de tokens Studio (paiement unique, n'expirent
// pas, utilisables UNIQUEMENT par le Studio).
// ══════════════════════════════════════════════════════════════

export const STUDIO_TIERS = ['pro', 'expert'] as const

// Quota mensuel de tokens Studio inclus par abonnement (tokens pondérés,
// mêmes multiplicateurs que le chat : Hermès ×1, Athéna ×3, Zeus ×6).
export const STUDIO_MONTHLY_TOKENS: Record<string, number> = {
  trial: 0,
  premium: 0,
  pro: 300_000,
  expert: 1_000_000,
}

export type StudioPackKey = 'decouverte' | 'builder' | 'architecte'

export interface StudioPack {
  key: StudioPackKey
  label: string
  tokens: number
  tagline: string
}

// RÈGLE APPLE : aucun prix affiché DANS l'app — l'achat et les tarifs
// vivent sur le site web (bouton « Voir sur le site »).
export const STUDIO_PACKS: StudioPack[] = [
  { key: 'decouverte', label: 'Pack Découverte', tokens: 200_000,   tagline: 'Environ 8 à 15 runs selon les modèles' },
  { key: 'builder',    label: 'Pack Builder',    tokens: 1_000_000, tagline: 'Le meilleur ratio pour un usage régulier' },
  { key: 'architecte', label: 'Pack Architecte', tokens: 5_000_000, tagline: 'Pour les systèmes complexes qui tournent souvent' },
]

// Estimation du coût d'un run par nœud IA (tokens PONDÉRÉS, ordre de
// grandeur observé : prompt + données injectées + réponse).
export const STUDIO_NODE_COST: Record<string, number> = {
  hermes: 4_000,
  athena: 10_000,
  zeus: 22_000,
}

export interface StudioAccess {
  allowed: boolean
  tier: string
  monthlyUsed: number
  monthlyLimit: number
  packTokens: number
  remaining: number
  packsAvailable: boolean   // les prix Stripe des packs sont-ils configurés ?
}

/** Estimation pondérée du coût d'un run pour un graphe donné. */
export function estimateRunTokens(nodes: { kind: string; model?: string }[]): number {
  let sum = 0
  for (const n of nodes) {
    if (n.kind === 'agent' || n.kind === 'merge') sum += STUDIO_NODE_COST[n.model ?? 'athena'] ?? STUDIO_NODE_COST.athena
    else if (n.kind === 'action') sum += STUDIO_NODE_COST[n.model ?? 'hermes'] ?? STUDIO_NODE_COST.hermes
  }
  return sum
}

export function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)} M`
  if (n >= 1_000) return `${Math.round(n / 1_000)} k`
  return String(n)
}
