// ══════════════════════════════════════════════════════════════
// TOKENS — limites, jauges, consommation.
// Service client (bypass RLS) car les écritures token_usage/wallet
// sont interdites en contexte user (RLS = SELECT own uniquement).
// ══════════════════════════════════════════════════════════════

import { createServiceClient } from '@/lib/supabase/server'
import { getUserTier } from '@/lib/subscriptions/check-quota'

export interface TokenLimits {
  monthly:     { used: number; limit: number; resets_at: string }
  rolling_6h:  { used: number; limit: number; resets_at: string }
  per_request: number
  bonus_tokens: number
  plan: string
}

interface PlanLimitsRow {
  monthly_tokens: number
  rolling_6h_tokens: number
  per_request_tokens: number
}

const SIX_HOURS_MS = 6 * 60 * 60 * 1000

const FALLBACK_LIMITS: Record<string, PlanLimitsRow> = {
  trial:   { monthly_tokens: 50000,   rolling_6h_tokens: 15000,  per_request_tokens: 8000 },
  premium: { monthly_tokens: 250000,  rolling_6h_tokens: 60000,  per_request_tokens: 15000 },
  pro:     { monthly_tokens: 750000,  rolling_6h_tokens: 150000, per_request_tokens: 25000 },
  expert:  { monthly_tokens: 2000000, rolling_6h_tokens: 350000, per_request_tokens: 50000 },
}

function sumTokens(rows: { tokens_used: number }[] | null): number {
  return (rows ?? []).reduce((s, r) => s + (r.tokens_used ?? 0), 0)
}

export async function getUserTokenLimits(userId: string): Promise<TokenLimits> {
  const sb = createServiceClient()

  const plan = await getUserTier(userId) // premium | pro | expert (défaut premium)

  // Date de début de période (= début d'abonnement, sinon NOW)
  const { data: sub } = await sb
    .from('user_subscriptions')
    .select('current_period_start')
    .eq('user_id', userId)
    .single()
  const periodStart = sub?.current_period_start ? new Date(sub.current_period_start) : new Date()

  // Limites du plan
  const { data: limitsRow } = await sb
    .from('token_plan_limits')
    .select('monthly_tokens, rolling_6h_tokens, per_request_tokens')
    .eq('plan', plan)
    .single()
  const limits: PlanLimitsRow = (limitsRow as PlanLimitsRow | null) ?? FALLBACK_LIMITS[plan] ?? FALLBACK_LIMITS.premium

  // Wallet bonus
  const { data: wallet } = await sb
    .from('user_token_wallet')
    .select('bonus_tokens')
    .eq('user_id', userId)
    .single()
  const bonusTokens = wallet?.bonus_tokens ?? 0

  // Consommation période (source 'plan')
  const { data: monthlyRows } = await sb
    .from('token_usage')
    .select('tokens_used')
    .eq('user_id', userId)
    .eq('source', 'plan')
    .gte('created_at', periodStart.toISOString())
  const monthlyUsed = sumTokens(monthlyRows as { tokens_used: number }[] | null)

  // Consommation 6h glissantes (toutes sources)
  const sixHoursAgo = new Date(Date.now() - SIX_HOURS_MS)
  const { data: recentRows } = await sb
    .from('token_usage')
    .select('tokens_used')
    .eq('user_id', userId)
    .gte('created_at', sixHoursAgo.toISOString())
  const rolling6hUsed = sumTokens(recentRows as { tokens_used: number }[] | null)

  // Reset hebdo = periodStart + 7j
  const nextReset = new Date(periodStart)
  nextReset.setDate(nextReset.getDate() + 7)

  // Reset 6h = plus ancienne conso récente + 6h
  const { data: oldest } = await sb
    .from('token_usage')
    .select('created_at')
    .eq('user_id', userId)
    .gte('created_at', sixHoursAgo.toISOString())
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()
  const rolling6hResetsAt = oldest?.created_at
    ? new Date(new Date(oldest.created_at).getTime() + SIX_HOURS_MS).toISOString()
    : new Date(Date.now() + SIX_HOURS_MS).toISOString()

  return {
    monthly:     { used: monthlyUsed, limit: limits.monthly_tokens, resets_at: nextReset.toISOString() },
    rolling_6h:  { used: rolling6hUsed, limit: limits.rolling_6h_tokens, resets_at: rolling6hResetsAt },
    per_request: limits.per_request_tokens,
    bonus_tokens: bonusTokens,
    plan,
  }
}

interface TokenMeta { conversationId?: string; messageId?: string; model?: string }

/**
 * Insère la consommation réelle (best-effort, ne rejette jamais).
 * Débite d'abord le plan, puis les tokens bonus si le plan est épuisé.
 */
export async function recordTokenUsage(userId: string, tokensUsed: number, meta: TokenMeta = {}): Promise<void> {
  if (tokensUsed <= 0) return
  try {
    const sb = createServiceClient()
    const limits = await getUserTokenLimits(userId)
    const remainingPlan = Math.max(0, limits.monthly.limit - limits.monthly.used)
    const base = { user_id: userId, conversation_id: meta.conversationId ?? null, message_id: meta.messageId ?? null, model: meta.model ?? null }

    if (remainingPlan >= tokensUsed) {
      await sb.from('token_usage').insert({ ...base, tokens_used: tokensUsed, source: 'plan' })
    } else {
      const fromPlan = remainingPlan
      const fromBonus = tokensUsed - fromPlan
      if (fromPlan > 0) await sb.from('token_usage').insert({ ...base, tokens_used: fromPlan, source: 'plan' })
      await sb.from('token_usage').insert({ ...base, tokens_used: fromBonus, source: 'bonus' })
      await sb.from('user_token_wallet')
        .update({ bonus_tokens: Math.max(0, limits.bonus_tokens - fromBonus), updated_at: new Date().toISOString() })
        .eq('user_id', userId)
    }
  } catch (e) {
    console.error('[recordTokenUsage] error:', e)
  }
}

/**
 * Vérifie + enregistre une consommation (rejette si au-delà des limites).
 */
export async function consumeTokens(
  userId: string,
  tokensUsed: number,
  conversationId?: string,
  messageId?: string,
  model?: string,
): Promise<{ success: boolean; error?: string }> {
  const limits = await getUserTokenLimits(userId)

  if (tokensUsed > limits.per_request) {
    return { success: false, error: `Cette demande est trop volumineuse (${tokensUsed} tokens). Maximum par requête : ${limits.per_request} tokens.` }
  }

  const remainingMonthly = limits.monthly.limit - limits.monthly.used
  const remainingRolling = limits.rolling_6h.limit - limits.rolling_6h.used
  const totalAvailable = remainingMonthly + limits.bonus_tokens

  if (tokensUsed > remainingRolling) {
    const hours = Math.ceil((new Date(limits.rolling_6h.resets_at).getTime() - Date.now()) / (60 * 60 * 1000))
    return { success: false, error: `Limite de 6h atteinte. Réinitialisation dans ${Math.max(1, hours)}h.` }
  }
  if (tokensUsed > totalAvailable) {
    return { success: false, error: 'Limite hebdomadaire atteinte. Achète des tokens supplémentaires ou attends le reset.' }
  }

  await recordTokenUsage(userId, tokensUsed, { conversationId, messageId, model })
  return { success: true }
}
