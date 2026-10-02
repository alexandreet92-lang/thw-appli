// ══════════════════════════════════════════════════════════════
// Interface IA MOBILE (≤ 767 px) — types partagés.
// Les données (actions rapides, thèmes, connecteurs) restent définies
// dans AIPanel.tsx (source unique) et sont passées en props.
// ══════════════════════════════════════════════════════════════

export type AimModel = 'hermes' | 'athena' | 'zeus'
export type AimAgent = 'training' | 'networks' | 'coach'

/** Action rapide (sous-ensemble de QuickAction d'AIPanel). */
export interface AimQuickAction {
  key: string
  label: string
  sub: string
  model: AimModel
  flow?: string | null
}

/** Thème d'actions rapides (ids résolus par `key`). */
export interface AimTheme {
  id: string
  label: string
  keys: string[]
}

/** Connecteur affiché dans le sous-écran « Connecteurs ». */
export interface AimConnector {
  id: string
  name: string
  logo: string
  connected: boolean
}

/** Jauges de tokens (réponse de /api/tokens/limits). */
export interface AimTokenLimits {
  monthly: { used: number; limit: number; resets_at: string }
  rolling_6h: { used: number; limit: number; resets_at: string }
  per_request: number
  bonus_tokens: number
  plan: string
}

export function limitPct(used: number, limit: number): number {
  if (!limit || !isFinite(limit)) return 0
  return Math.min(100, Math.max(0, (used / limit) * 100))
}
