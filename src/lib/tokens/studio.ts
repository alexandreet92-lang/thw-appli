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

  // Pack coach (ou essai coach) : inclut le Studio + ~1 M tokens/mois, quel que
  // soit le tier athlète du coach.
  let coachStudioTokens = 0
  if (!creator) {
    const sbc = createServiceClient()
    const { data: cs } = await sbc.from('coach_subscriptions').select('status').eq('user_id', userId).maybeSingle()
    if (cs && (cs.status === 'active' || cs.status === 'trialing')) coachStudioTokens = 1_000_000
    else {
      const { data: prof } = await sbc.from('profiles').select('coach_trial_started_at').eq('id', userId).maybeSingle()
      const startedIso = (prof as { coach_trial_started_at?: string | null } | null)?.coach_trial_started_at
      if (startedIso && Date.now() - new Date(startedIso).getTime() < 14 * 86400000) coachStudioTokens = 1_000_000
    }
  }

  const allowed = creator || coachStudioTokens > 0 || (STUDIO_TIERS as readonly string[]).includes(tier)
  const monthlyLimit = Math.max(coachStudioTokens, STUDIO_MONTHLY_TOKENS[tier] ?? 0)

  const sb = createServiceClient()
  // Consommation MENSUELLE = uniquement les tokens décomptés du quota inclus
  // (source='monthly'). Les tokens de packs ont leur propre solde (studio_wallet)
  // et ne doivent PAS gonfler monthlyUsed.
  const { data: rows } = await sb
    .from('studio_usage')
    .select('tokens_used')
    .eq('user_id', userId)
    .eq('source', 'monthly')
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
      // Débit ATOMIQUE du wallet (verrou DB) : évite la perte de tokens quand
      // plusieurs nœuds d'un run Studio s'exécutent en parallèle. La RPC borne à 0
      // et renvoie le montant RÉELLEMENT débité — on ne logue que celui-ci pour ne
      // pas comptabiliser plus que le solde disponible.
      if (fromPack > 0) {
        const { data: debited } = await sb.rpc('debit_studio_pack', { p_user_id: userId, p_amount: fromPack })
        const actuallyDebited = typeof debited === 'number' ? debited : fromPack
        if (actuallyDebited > 0) {
          await sb.from('studio_usage').insert({ ...base, tokens_used: actuallyDebited, raw_tokens: Math.round(actuallyDebited / mult), source: 'pack' })
        }
      }
    }
  } catch (e) {
    console.error('[recordStudioUsage] error:', e)
  }
}

/** Crédite des tokens de pack (webhook Stripe). Incrément ATOMIQUE côté DB :
 *  un crédit qui arrive pendant un run actif ne peut plus écraser le solde. */
export async function creditStudioPack(userId: string, tokens: number): Promise<void> {
  if (tokens <= 0) return
  const sb = createServiceClient()
  const { error } = await sb.rpc('credit_studio_pack', { p_user_id: userId, p_tokens: tokens })
  if (error) console.error('[creditStudioPack] rpc error:', error.message)
}
