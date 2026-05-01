// ══════════════════════════════════════════════════════════════════
// CHECK-QUOTA — Lecture du tier, comptage des usages, vérification
// ══════════════════════════════════════════════════════════════════

import { createServiceClient } from '@/lib/supabase/server'
import { TIER_LIMITS, type TierName } from './tier-limits'

// ── Types publics ──────────────────────────────────────────────────

export type UsageType =
  | 'message'
  | 'plan_generation'
  | 'tool_use'
  | 'briefing'
  | 'nutrition_plan'
  | 'micro_agent'

export interface QuotaResult {
  allowed: boolean
  used: number
  limit: number      // Infinity si illimité
  tier: TierName
  reset_at: string   // ISO date de remise à zéro du compteur
}

// ── Helpers internes ───────────────────────────────────────────────

/**
 * Retourne la date de début de la période de comptage.
 * - briefing : 7 derniers jours (limite hebdomadaire)
 * - tout le reste : 1er du mois en cours (limite mensuelle)
 */
function getPeriodStart(type: UsageType): Date {
  const now = new Date()
  if (type === 'briefing') {
    const d = new Date(now)
    d.setDate(d.getDate() - 7)
    return d
  }
  return new Date(now.getFullYear(), now.getMonth(), 1)
}

/**
 * Date ISO à laquelle le compteur sera remis à zéro.
 */
function getResetAt(type: UsageType): string {
  const now = new Date()
  if (type === 'briefing') {
    // Dans 7 jours
    const d = new Date(now)
    d.setDate(d.getDate() + 7)
    return d.toISOString()
  }
  // 1er du mois prochain
  return new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString()
}

/**
 * Retourne la limite numérique pour un type d'usage donné et un tier.
 * Les micro_agents sont décomptés sur le même quota que les messages.
 */
function getLimit(tier: TierName, type: UsageType): number {
  const limits = TIER_LIMITS[tier]
  switch (type) {
    case 'message':
    case 'micro_agent':   return limits.messages_per_month
    case 'plan_generation': return limits.plans_per_month
    case 'tool_use':      return limits.tool_use_per_month
    case 'briefing':      return limits.briefings_per_week
    case 'nutrition_plan': return limits.nutrition_plans_per_month
    default:              return Infinity
  }
}

// ── Fonctions exportées ────────────────────────────────────────────

/**
 * Retourne le tier actif d'un utilisateur.
 * Défaut → 'premium' si aucun abonnement actif trouvé.
 */
export async function getUserTier(userId: string): Promise<TierName> {
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('user_subscriptions')
    .select('tier, status')
    .eq('user_id', userId)
    .single()

  if (!data) return 'premium'
  if (data.status !== 'active' && data.status !== 'trialing') return 'premium'
  return data.tier as TierName
}

/**
 * Compte les entrées usage_logs pour un user, un type et une date de début.
 */
export async function getUsageCount(
  userId: string,
  type: UsageType,
  since: Date,
): Promise<number> {
  const supabase = createServiceClient()
  const { count, error } = await supabase
    .from('usage_logs')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('type', type)
    .gte('created_at', since.toISOString())

  if (error) {
    console.error('[check-quota] getUsageCount error:', error)
    return 0
  }
  return count ?? 0
}

/**
 * Vérifie si l'utilisateur peut effectuer une action.
 *
 * Règle micro_agent : les appels micro_agent + message sont cumulés
 * sur le même quota mensuel (messages_per_month).
 */
export async function checkQuota(
  userId: string,
  type: UsageType,
): Promise<QuotaResult> {
  const tier = await getUserTier(userId)
  const limit = getLimit(tier, type)
  const reset_at = getResetAt(type)

  // Illimité → pas de requête DB
  if (!isFinite(limit)) {
    return { allowed: true, used: 0, limit: Infinity, tier, reset_at }
  }

  const since = getPeriodStart(type)

  // micro_agent : cumuler avec 'message' sur le même quota
  let used: number
  if (type === 'micro_agent') {
    const [msgCount, agentCount] = await Promise.all([
      getUsageCount(userId, 'message', since),
      getUsageCount(userId, 'micro_agent', since),
    ])
    used = msgCount + agentCount
  } else {
    used = await getUsageCount(userId, type, since)
  }

  return {
    allowed: used < limit,
    used,
    limit,
    tier,
    reset_at,
  }
}

/**
 * Insère un log d'usage.
 * Utilise le service client (bypass RLS) — appelé côté serveur uniquement.
 */
export async function logUsage(
  userId: string,
  type: UsageType,
  metadata?: Record<string, unknown>,
): Promise<void> {
  const supabase = createServiceClient()
  const { error } = await supabase.from('usage_logs').insert({
    user_id: userId,
    type,
    metadata: metadata ?? {},
  })
  if (error) {
    // Non-bloquant : un échec de log ne doit pas faire échouer la requête
    console.error('[check-quota] logUsage error:', error)
  }
}

/**
 * Retourne le résumé d'usage du mois en cours pour un utilisateur.
 * Utile pour afficher les jauges dans les settings.
 */
export async function getUsageSummary(userId: string): Promise<{
  tier: TierName
  usage: Record<UsageType, { used: number; limit: number; reset_at: string }>
}> {
  const tier = await getUserTier(userId)
  const monthStart = getPeriodStart('message')
  const weekStart  = getPeriodStart('briefing')

  const types: UsageType[] = ['message', 'plan_generation', 'tool_use', 'briefing', 'nutrition_plan', 'micro_agent']

  // Requêtes en parallèle
  const counts = await Promise.all(
    types.map(t =>
      getUsageCount(userId, t, t === 'briefing' ? weekStart : monthStart)
    )
  )

  const usage = {} as Record<UsageType, { used: number; limit: number; reset_at: string }>
  types.forEach((t, i) => {
    const rawUsed = counts[i]
    // micro_agent : afficher le total combiné avec message
    const used = t === 'micro_agent'
      ? rawUsed + (counts[types.indexOf('message')] ?? 0)
      : rawUsed
    usage[t] = {
      used,
      limit: getLimit(tier, t),
      reset_at: getResetAt(t),
    }
  })

  return { tier, usage }
}
