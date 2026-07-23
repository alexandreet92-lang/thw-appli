// ══════════════════════════════════════════════════════════════
// TOKENS STUDIO — solde et comptabilité SÉPARÉS du quota chat.
// Service client (bypass RLS) : studio_usage / studio_wallet ne
// sont inscriptibles qu'en contexte serveur.
// ──────────────────────────────────────────────────────────────
// Ordre de débit : quota mensuel inclus (Pro/Expert) puis tokens
// de packs (paiement unique, n'expirent pas).
// ══════════════════════════════════════════════════════════════

import { createServiceClient } from '@/lib/supabase/server'
import { getUserTier, isCreatorAccount } from '@/lib/subscriptions/check-quota'
import { getModelMultiplier } from './multipliers'
import { STUDIO_TIERS, STUDIO_MONTHLY_TOKENS, type StudioAccess } from '@/lib/studio/offers'

function monthStartISO(): string {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString()
}

export async function getStudioAccess(userId: string): Promise<StudioAccess> {
  const creator = await isCreatorAccount(userId)
  const tier = creator ? 'expert' : await getUserTier(userId)
  const allowed = creator || (STUDIO_TIERS as readonly string[]).includes(tier)
  const monthlyLimit = STUDIO_MONTHLY_TOKENS[tier] ?? 0

  const sb = createServiceClient()
  const { data: rows } = await sb
    .from('studio_usage')
    .select('tokens_used')
    .eq('user_id', userId)
    .gte('created_at', monthStartISO())
  const monthlyUsed = (rows ?? []).reduce((s, r) => s + (r.tokens_used ?? 0), 0)

  const { data: wallet } = await sb
    .from('studio_wallet')
    .select('pack_tokens')
    .eq('user_id', userId)
    .maybeSingle()
  const packTokens = wallet?.pack_tokens ?? 0

  const remaining = creator
    ? Number.MAX_SAFE_INTEGER
    : Math.max(0, monthlyLimit - monthlyUsed) + packTokens

  const packsAvailable = Boolean(
    process.env.STRIPE_PRICE_STUDIO_DECOUVERTE
    && process.env.STRIPE_PRICE_STUDIO_BUILDER
    && process.env.STRIPE_PRICE_STUDIO_ARCHITECTE,
  )

  return { allowed, tier, monthlyUsed, monthlyLimit, packTokens, remaining, packsAvailable }
}

/**
 * Enregistre une consommation Studio (best-effort, ne rejette jamais).
 * `rawTokens` = tokens réels API ; on stocke le PONDÉRÉ (× multiplicateur).
 * Débite le quota mensuel puis les tokens de packs.
 */
export async function recordStudioUsage(userId: string, rawTokens: number, model?: string, runId?: string): Promise<void> {
  if (rawTokens <= 0) return
  try {
    const sb = createServiceClient()
    const mult = model ? getModelMultiplier(model) : 1
    const weighted = Math.ceil(rawTokens * mult)
    const access = await getStudioAccess(userId)
    const remainingMonthly = Math.max(0, access.monthlyLimit - access.monthlyUsed)
    const base = { user_id: userId, run_id: runId ?? null, model: model ?? null }

    if (remainingMonthly >= weighted) {
      await sb.from('studio_usage').insert({ ...base, tokens_used: weighted, raw_tokens: rawTokens, source: 'monthly' })
    } else {
      const fromMonthly = remainingMonthly
      const fromPack = weighted - fromMonthly
      if (fromMonthly > 0) {
        await sb.from('studio_usage').insert({ ...base, tokens_used: fromMonthly, raw_tokens: Math.round(fromMonthly / mult), source: 'monthly' })
      }
      await sb.from('studio_usage').insert({ ...base, tokens_used: fromPack, raw_tokens: Math.round(fromPack / mult), source: 'pack' })
      await sb.from('studio_wallet').upsert(
        { user_id: userId, pack_tokens: Math.max(0, access.packTokens - fromPack), updated_at: new Date().toISOString() },
        { onConflict: 'user_id' },
      )
    }
  } catch (e) {
    console.error('[recordStudioUsage] error:', e)
  }
}

/** Crédite des tokens de pack (webhook Stripe). */
export async function creditStudioPack(userId: string, tokens: number): Promise<void> {
  if (tokens <= 0) return
  const sb = createServiceClient()
  const { data: wallet } = await sb
    .from('studio_wallet')
    .select('pack_tokens')
    .eq('user_id', userId)
    .maybeSingle()
  await sb.from('studio_wallet').upsert(
    { user_id: userId, pack_tokens: (wallet?.pack_tokens ?? 0) + tokens, updated_at: new Date().toISOString() },
    { onConflict: 'user_id' },
  )
}
