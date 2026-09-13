// ══════════════════════════════════════════════════════════════
// TOKENS — limites, jauges, consommation.
// Service client (bypass RLS) car les écritures token_usage/wallet
// sont interdites en contexte user (RLS = SELECT own uniquement).
// ══════════════════════════════════════════════════════════════

import { createServiceClient } from '@/lib/supabase/server'
import { getUserTier, isCreatorAccount } from '@/lib/subscriptions/check-quota'
import { getModelMultiplier } from './multipliers'
import { notifyUser } from '@/lib/notifications/dispatch'

export interface TokenLimits {
  /** Fenêtre HEBDOMADAIRE glissante (7 jours) — identique pour tous les plans. */
  weekly:      { used: number; limit: number; resets_at: string }
  rolling_6h:  { used: number; limit: number; resets_at: string }
  per_request: number
  bonus_tokens: number
  plan: string
}

interface PlanLimitsRow {
  weekly_tokens: number
  rolling_6h_tokens: number
  per_request_tokens: number
}

const SIX_HOURS_MS = 6 * 60 * 60 * 1000
const WEEK_MS = 7 * 24 * 60 * 60 * 1000

// Doit rester aligné avec la migration tokens_limits_weekly.sql (source de
// vérité = table token_plan_limits).
//
// MODÈLE : deux fenêtres glissantes, comme Claude / ChatGPT — une courte (6 h)
// qui lisse les pics, une longue (7 j) qui borne le budget. AUCUNE notion de
// mois : un utilisateur ne doit pas avoir une limite différente selon qu'il a
// pris son abonnement en direct ou via un pack coach.
//
// CALIBRAGE (coût réel ≈ 1 $ / M tokens pondérés en entrée, 5 $ / M en sortie,
// les multiplicateurs ×1/×3/×6 égalisant déjà les modèles) :
//   premium  175k/sem ≈ 0,75 M/mois ≈  1,1 $/mois   sur 14 €  →  7 %
//   pro      700k/sem ≈ 3,0  M/mois ≈  4,5 $/mois   sur 26 €  → 16 %
//   expert   2 M/sem  ≈ 8,6  M/mois ≈ 13   $/mois   sur 49 €  → 24 %
// Seuil d'alerte marge = 30 % du MRR (voir admin/metrics.ts).
const FALLBACK_LIMITS: Record<string, PlanLimitsRow> = {
  trial:   { weekly_tokens: 120000,  rolling_6h_tokens: 40000,  per_request_tokens: 12000 },
  premium: { weekly_tokens: 175000,  rolling_6h_tokens: 80000,  per_request_tokens: 25000 },
  pro:     { weekly_tokens: 700000,  rolling_6h_tokens: 300000, per_request_tokens: 60000 },
  expert:  { weekly_tokens: 2000000, rolling_6h_tokens: 800000, per_request_tokens: 150000 },
}

/** Clé de semaine ISO (YYYY-Www) — sert à dédupliquer les alertes de quota. */
function isoWeekKey(d: Date): string {
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
  // Jeudi de la semaine courante → détermine l'année ISO.
  t.setUTCDate(t.getUTCDate() + 4 - (t.getUTCDay() || 7))
  const yearStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1))
  const week = Math.ceil(((t.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
  return `${t.getUTCFullYear()}-W${String(week).padStart(2, '0')}`
}

function sumTokens(rows: { tokens_used: number }[] | null): number {
  return (rows ?? []).reduce((s, r) => s + (r.tokens_used ?? 0), 0)
}

export async function getUserTokenLimits(userId: string): Promise<TokenLimits> {
  const sb = createServiceClient()

  // Compte créateur (détecté par email) → limites Expert (illimité de fait)
  const unlimited = await isCreatorAccount(userId)
  const plan = unlimited ? 'expert' : await getUserTier(userId) // premium | pro | expert

  // Fenêtre glissante de 7 jours, pour TOUT LE MONDE.
  // Avant : les abonnés « athlète » (qui ont un current_period_start posé par
  // Stripe) étaient calés sur leur période de facturation (~1 mois) tandis que
  // les coachs, les essais et les comptes gratuits tournaient sur 7 jours → deux
  // utilisateurs du même tier n'avaient pas la même limite. Une seule règle.
  const periodStart = new Date(Date.now() - WEEK_MS)

  // Limites du plan
  const { data: limitsRow } = await sb
    .from('token_plan_limits')
    .select('weekly_tokens, rolling_6h_tokens, per_request_tokens')
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

  // Consommation de la semaine glissante (source 'plan')
  const { data: weeklyRows } = await sb
    .from('token_usage')
    .select('tokens_used')
    .eq('user_id', userId)
    .eq('source', 'plan')
    .gte('created_at', periodStart.toISOString())
  const weeklyUsed = sumTokens(weeklyRows as { tokens_used: number }[] | null)

  // Consommation 6h glissantes (toutes sources)
  const sixHoursAgo = new Date(Date.now() - SIX_HOURS_MS)
  const { data: recentRows } = await sb
    .from('token_usage')
    .select('tokens_used')
    .eq('user_id', userId)
    .gte('created_at', sixHoursAgo.toISOString())
  const rolling6hUsed = sumTokens(recentRows as { tokens_used: number }[] | null)

  // Reset hebdo (fenêtre glissante) = plus ancienne conso de la fenêtre + 7 j :
  // c'est le moment où des tokens redeviennent réellement disponibles.
  const { data: oldestWeek } = await sb
    .from('token_usage')
    .select('created_at')
    .eq('user_id', userId)
    .eq('source', 'plan')
    .gte('created_at', periodStart.toISOString())
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()
  const weekResetsAt = oldestWeek?.created_at
    ? new Date(new Date(oldestWeek.created_at).getTime() + WEEK_MS).toISOString()
    : new Date(Date.now() + WEEK_MS).toISOString()

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
    weekly:      { used: weeklyUsed, limit: limits.weekly_tokens, resets_at: weekResetsAt },
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
    const remainingPlan = Math.max(0, limits.weekly.limit - limits.weekly.used)
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

    // ── Seuils de quota hebdomadaire → notification (une fois par semaine) ──
    // On détecte le FRANCHISSEMENT d'un seuil (80 / 95 / 100 %) grâce à
    // l'usage AVANT (limits.weekly.used) et APRÈS cette consommation.
    try {
      const limit = limits.weekly.limit
      if (limit > 0) {
        const prevUsed = limits.weekly.used
        const newUsed  = prevUsed + Math.min(weighted, remainingPlan)
        const prev = prevUsed / limit
        const next = newUsed / limit
        const period = isoWeekKey(new Date())   // YYYY-Www (fenêtre hebdo)
        if (prev < 1 && next >= 1) {
          void notifyUser(userId, 'tokens.quota_epuise', { title: 'Quota épuisé', body: 'Tu as utilisé tout ton quota hebdomadaire. Achète des tokens ou attends le reset.', url: '/settings/subscription', dedupKey: `quota-epuise-${period}`, once: true })
        } else if (prev < 0.95 && next >= 0.95) {
          void notifyUser(userId, 'tokens.quota_95', { title: 'Quota à 95%', body: 'Ta limite hebdomadaire est presque atteinte.', url: '/settings/subscription', dedupKey: `quota-95-${period}`, once: true })
        } else if (prev < 0.8 && next >= 0.8) {
          void notifyUser(userId, 'tokens.quota_80', { title: 'Quota à 80%', body: 'Tu approches de ta limite hebdomadaire.', url: '/settings/subscription', dedupKey: `quota-80-${period}`, once: true })
        }
      }
    } catch { /* best-effort */ }
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

  const remainingWeekly = limits.weekly.limit - limits.weekly.used
  const remainingRolling = limits.rolling_6h.limit - limits.rolling_6h.used
  const totalAvailable = remainingWeekly + limits.bonus_tokens

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
