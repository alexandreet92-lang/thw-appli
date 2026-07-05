// ══════════════════════════════════════════════════════════════
// TOKENS — limites, jauges, consommation.
// Service client (bypass RLS) car les écritures token_usage/wallet
// sont interdites en contexte user (RLS = SELECT own uniquement).
// ══════════════════════════════════════════════════════════════

import { createServiceClient } from '@/lib/supabase/server'
import { getUserTier, isCreatorAccount } from '@/lib/subscriptions/check-quota'
import { getModelMultiplier } from './multipliers'

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
const WEEK_MS = 7 * 24 * 60 * 60 * 1000

// Doit rester aligné avec la migration tokens_limits_rebalance.sql (source de
// vérité = table token_plan_limits). Calibré pour ~70 % de marge en usage
// normal dès Pro/Expert, en tenant compte du prompt caching de la boucle coach.
const FALLBACK_LIMITS: Record<string, PlanLimitsRow> = {
  trial:   { monthly_tokens: 120000,  rolling_6h_tokens: 40000,   per_request_tokens: 12000 },
  premium: { monthly_tokens: 700000,  rolling_6h_tokens: 200000,  per_request_tokens: 25000 },
  pro:     { monthly_tokens: 3000000, rolling_6h_tokens: 800000,  per_request_tokens: 60000 },
  expert:  { monthly_tokens: 8000000, rolling_6h_tokens: 2000000, per_request_tokens: 150000 },
}

function sumTokens(rows: { tokens_used: number }[] | null): number {
  return (rows ?? []).reduce((s, r) => s + (r.tokens_used ?? 0), 0)
}

export async function getUserTokenLimits(userId: string): Promise<TokenLimits> {
  const sb = createServiceClient()

  // Compte créateur (détecté par email) → limites Expert (illimité de fait)
  const unlimited = await isCreatorAccount(userId)
  const plan = unlimited ? 'expert' : await getUserTier(userId) // premium | pro | expert

  // Date de début de période. Avec abonnement → début de période. SANS abonnement
  // (cas fréquent) → fenêtre glissante de 7 jours (avant : NOW → la jauge hebdo
  // restait à 0 car la fenêtre démarrait « maintenant » et ne capturait rien).
  const { data: sub } = await sb
    .from('user_subscriptions')
    .select('current_period_start')
    .eq('user_id', userId)
    .single()
  const hasSub = !!sub?.current_period_start
  const periodStart = hasSub ? new Date(sub!.current_period_start) : new Date(Date.now() - WEEK_MS)

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

  // Reset hebdo : avec abonnement = periodStart + 7j ; sinon (fenêtre glissante)
  // = plus ancienne conso de la fenêtre + 7j.
  let weekResetsAt: string
  if (hasSub) {
    const nr = new Date(periodStart); nr.setDate(nr.getDate() + 7); weekResetsAt = nr.toISOString()
  } else {
    const { data: oldestWeek } = await sb
      .from('token_usage')
      .select('created_at')
      .eq('user_id', userId)
      .eq('source', 'plan')
      .gte('created_at', periodStart.toISOString())
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle()
    weekResetsAt = oldestWeek?.created_at
      ? new Date(new Date(oldestWeek.created_at).getTime() + WEEK_MS).toISOString()
      : new Date(Date.now() + WEEK_MS).toISOString()
  }

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
    monthly:     { used: monthlyUsed, limit: limits.monthly_tokens, resets_at: weekResetsAt },
    rolling_6h:  { used: rolling6hUsed, limit: limits.rolling_6h_tokens, resets_at: rolling6hResetsAt },
    per_request: limits.per_request_tokens,
    bonus_tokens: bonusTokens,
    plan,
  }
}

interface TokenMeta { conversationId?: string; messageId?: string; model?: string }

/**
 * Insère la consommation (best-effort, ne rejette jamais).
 * `rawTokens` = tokens réels API ; on stocke le PONDÉRÉ (× multiplicateur du
 * modèle) dans tokens_used, le réel dans raw_tokens. Débite plan puis bonus.
 */
export async function recordTokenUsage(userId: string, rawTokens: number, meta: TokenMeta = {}): Promise<void> {
  if (rawTokens <= 0) return
  try {
    const sb = createServiceClient()
    const mult = meta.model ? getModelMultiplier(meta.model) : 1
    const weighted = Math.ceil(rawTokens * mult)
    const limits = await getUserTokenLimits(userId)
    const remainingPlan = Math.max(0, limits.monthly.limit - limits.monthly.used)
    const base = {
      user_id: userId, conversation_id: meta.conversationId ?? null,
      message_id: meta.messageId ?? null, model: meta.model ?? null, multiplier: mult,
    }

    if (remainingPlan >= weighted) {
      await sb.from('token_usage').insert({ ...base, tokens_used: weighted, raw_tokens: rawTokens, source: 'plan' })
    } else {
      const fromPlan = remainingPlan
      const fromBonus = weighted - fromPlan
      if (fromPlan > 0) await sb.from('token_usage').insert({ ...base, tokens_used: fromPlan, raw_tokens: Math.round(fromPlan / mult), source: 'plan' })
      await sb.from('token_usage').insert({ ...base, tokens_used: fromBonus, raw_tokens: Math.round(fromBonus / mult), source: 'bonus' })
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
  // Compte créateur : on enregistre mais on ne bloque jamais
  if (await isCreatorAccount(userId)) {
    await recordTokenUsage(userId, tokensUsed, { conversationId, messageId, model })
    return { success: true }
  }

  // Pondération par le multiplicateur du modèle (tokensUsed = tokens réels)
  const mult = model ? getModelMultiplier(model) : 1
  const weighted = Math.ceil(tokensUsed * mult)
  const limits = await getUserTokenLimits(userId)

  if (weighted > limits.per_request) {
    return { success: false, error: `Cette demande est trop volumineuse (${weighted} tokens). Maximum par requête : ${limits.per_request} tokens.` }
  }

  const remainingMonthly = limits.monthly.limit - limits.monthly.used
  const remainingRolling = limits.rolling_6h.limit - limits.rolling_6h.used
  const totalAvailable = remainingMonthly + limits.bonus_tokens

  if (weighted > remainingRolling) {
    const hours = Math.ceil((new Date(limits.rolling_6h.resets_at).getTime() - Date.now()) / (60 * 60 * 1000))
    return { success: false, error: `Limite de 6h atteinte. Réinitialisation dans ${Math.max(1, hours)}h.` }
  }
  if (weighted > totalAvailable) {
    return { success: false, error: 'Limite hebdomadaire atteinte. Achète des tokens supplémentaires ou attends le reset.' }
  }

  // recordTokenUsage repondère en interne → on lui passe les tokens RÉELS
  await recordTokenUsage(userId, tokensUsed, { conversationId, messageId, model })
  return { success: true }
}
