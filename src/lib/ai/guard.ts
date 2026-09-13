// ══════════════════════════════════════════════════════════════
// GARDE DES ROUTES IA — authentification + débit + limite de vitesse.
//
// Toute route qui appelle un modèle DOIT commencer par :
//
//   const guard = await guardAiRoute('zeus')
//   if (!guard.ok) return guard.response
//   const userId = guard.userId
//
// … et finir par billAnthropicUsage(userId, response.usage, 'zeus').
//
// Sans ça, la route est appelable par n'importe qui sans compte (le middleware
// laisse passer tout /api) et sa consommation n'apparaît ni dans les quotas ni
// dans le cockpit admin.
// ══════════════════════════════════════════════════════════════

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getUserTokenLimits } from '@/lib/tokens/limits'
import type { AiModelKey } from './billing'

export type AiGuardResult =
  | { ok: true; userId: string }
  | { ok: false; response: NextResponse }

// ── Limite de vitesse (par instance serverless) ────────────────
// Ce n'est pas un compteur global — sur Vercel chaque instance a sa propre
// mémoire — mais ça coupe net les boucles client et les scripts naïfs. Le
// plafond de tokens (lui, en base) reste la borne dure.
const WINDOW_MS = 60_000
const MAX_PER_MIN: Record<AiModelKey, number> = {
  hermes: 30,   // Haiku — appels courts et fréquents (macros, tips…)
  athena: 15,   // Sonnet
  zeus:   8,    // Opus — les plus chers
}
const hits = new Map<string, number[]>()

function isRateLimited(userId: string, model: AiModelKey): boolean {
  const now = Date.now()
  const key = `${userId}:${model}`
  const recent = (hits.get(key) ?? []).filter(t => now - t < WINDOW_MS)
  if (recent.length >= MAX_PER_MIN[model]) {
    hits.set(key, recent)
    return true
  }
  recent.push(now)
  hits.set(key, recent)
  // Purge opportuniste : évite que la Map grossisse indéfiniment.
  if (hits.size > 5000) {
    for (const [k, v] of hits) if (!v.some(t => now - t < WINDOW_MS)) hits.delete(k)
  }
  return false
}

// ── Cache court du « il reste du budget ? » ────────────────────
// getUserTokenLimits fait plusieurs requêtes ; on ne la rejoue pas à chaque
// appel. 20 s de retard sur un plafond n'a aucune conséquence financière.
const BUDGET_TTL_MS = 20_000
const budgetCache = new Map<string, { at: number; hasBudget: boolean }>()

async function hasBudget(userId: string): Promise<boolean> {
  const cached = budgetCache.get(userId)
  if (cached && Date.now() - cached.at < BUDGET_TTL_MS) return cached.hasBudget
  try {
    const l = await getUserTokenLimits(userId)
    const weeklyLeft = (l.weekly.limit - l.weekly.used) + l.bonus_tokens
    const rollingLeft = l.rolling_6h.limit - l.rolling_6h.used
    const ok = weeklyLeft > 0 && rollingLeft > 0
    budgetCache.set(userId, { at: Date.now(), hasBudget: ok })
    return ok
  } catch (e) {
    // Fail-open : une erreur transitoire ne doit pas bloquer un abonné.
    console.error('[ai-guard] budget check failed (fail-open):', e)
    return true
  }
}

/** Invalide le cache budget d'un utilisateur (après une grosse consommation). */
export function invalidateBudgetCache(userId: string): void {
  budgetCache.delete(userId)
}

/**
 * Authentifie l'appelant, applique la limite de vitesse et vérifie qu'il lui
 * reste du budget. Renvoie l'userId, ou la Response d'erreur à retourner tel quel.
 */
export async function guardAiRoute(model: AiModelKey): Promise<AiGuardResult> {
  let userId: string
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { ok: false, response: NextResponse.json({ error: 'Non authentifié' }, { status: 401 }) }
    }
    userId = user.id
  } catch (e) {
    console.error('[ai-guard] auth error:', e)
    return { ok: false, response: NextResponse.json({ error: "Erreur d'authentification" }, { status: 401 }) }
  }

  if (isRateLimited(userId, model)) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Trop de demandes en peu de temps. Réessaie dans une minute.' },
        { status: 429 },
      ),
    }
  }

  if (!(await hasBudget(userId))) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Limite de tokens atteinte. Recharge ou attends le reset.' },
        { status: 402 },
      ),
    }
  }

  return { ok: true, userId }
}
