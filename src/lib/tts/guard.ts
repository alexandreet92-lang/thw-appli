// ══════════════════════════════════════════════════════════════════
// TTS GUARD — défense en couches pour /api/tts (poste OpenAI NON
// plafonné par le budget de tokens). Tout est vérifié CÔTÉ SERVEUR.
//
//  Couche 1 — Tier : Free/Trial (0 €) coupés ou quasi nuls.
//  Couche 2 — Quota mensuel de caractères par tier (Supabase, reset mensuel).
//  Couche 3 — Rate-limit fenêtre glissante 60 s, par compte ET par IP.
//  (Couche 4 = hard cap $ sur la clé OpenAI, côté dashboard — voir PROMPT_SECU_TTS.md)
//
// Seuils : tous dans src/lib/ai/cost-limits.ts (point unique de réglage).
// ══════════════════════════════════════════════════════════════════

import { createServiceClient } from '@/lib/supabase/server'
import { getUserTier, isCreatorAccount, logUsage } from '@/lib/subscriptions/check-quota'
import { TTS_CHARS_PER_MONTH, TTS_RATE_LIMIT } from '@/lib/ai/cost-limits'

export type TtsGuardResult =
  | { ok: true }
  | { ok: false; status: number; body: Record<string, unknown>; retryAfterSec?: number }

// ── Couche 3 : rate-limit en mémoire (best-effort, par instance) ────
// Map clé → timestamps (ms) des appels récents. Élagué à chaque check.
const rateBuckets = new Map<string, number[]>()

function rateHit(key: string, limit: number, now: number): boolean {
  const cutoff = now - TTS_RATE_LIMIT.windowMs
  const arr = (rateBuckets.get(key) ?? []).filter(t => t > cutoff)
  if (arr.length >= limit) { rateBuckets.set(key, arr); return true } // dépassé
  arr.push(now)
  rateBuckets.set(key, arr)
  return false
}

// Garde-fou mémoire : empêche la Map de grossir indéfiniment.
function pruneBuckets(now: number) {
  if (rateBuckets.size < 5000) return
  const cutoff = now - TTS_RATE_LIMIT.windowMs
  for (const [k, arr] of rateBuckets) {
    const kept = arr.filter(t => t > cutoff)
    if (kept.length === 0) rateBuckets.delete(k)
    else rateBuckets.set(k, kept)
  }
}

function monthStartISO(): string {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString()
}

function nextMonthISO(): string {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth() + 1, 1).toISOString()
}

/** Somme des caractères TTS consommés ce mois (source 'tts', metadata.chars). */
async function monthlyCharsUsed(userId: string): Promise<number> {
  const sb = createServiceClient()
  const { data, error } = await sb
    .from('usage_logs')
    .select('metadata')
    .eq('user_id', userId)
    .eq('type', 'tts')
    .gte('created_at', monthStartISO())
  if (error) throw error
  return (data ?? []).reduce((s, r) => {
    const c = Number((r as { metadata?: { chars?: unknown } }).metadata?.chars ?? 0)
    return s + (Number.isFinite(c) ? c : 0)
  }, 0)
}

/**
 * Vérifie qu'un appel TTS de `chars` caractères est autorisé.
 * `ip` sert au rate-limit par IP (peut être null si indisponible).
 * Politique fail-open sur erreur infra (ne bloque pas les payants) — le
 * hard cap OpenAI (couche 4) reste le dernier rempart.
 */
export async function guardTts(userId: string, ip: string | null, chars: number): Promise<TtsGuardResult> {
  const now = Date.now()

  // Compte créateur → aucun plafond.
  try {
    if (await isCreatorAccount(userId)) return { ok: true }
  } catch { /* fail-open */ }

  // ── Couche 1 : tier ───────────────────────────────────────────────
  let tier
  try {
    tier = await getUserTier(userId)
  } catch {
    // Infra HS → fail-open (les couches 3 + hard cap OpenAI protègent encore).
    return { ok: true }
  }
  const limit = TTS_CHARS_PER_MONTH[tier] ?? 0
  if (limit <= 0) {
    return {
      ok: false,
      status: 403,
      body: {
        error: 'La voix du coach est réservée aux abonnements. La lecture continue avec la voix de ton navigateur.',
        code: 'tts_tier_blocked',
        tier,
        upgrade_url: '/settings/subscription',
      },
    }
  }

  // ── Couche 3 : rate-limit (compte + IP) ───────────────────────────
  pruneBuckets(now)
  if (rateHit(`u:${userId}`, TTS_RATE_LIMIT.perAccountPerMin, now)) {
    return { ok: false, status: 429, retryAfterSec: 60, body: { error: 'Trop de requêtes vocales, réessaie dans une minute.', code: 'tts_rate_account' } }
  }
  if (ip && rateHit(`ip:${ip}`, TTS_RATE_LIMIT.perIpPerMin, now)) {
    return { ok: false, status: 429, retryAfterSec: 60, body: { error: 'Trop de requêtes vocales depuis ce réseau, réessaie dans une minute.', code: 'tts_rate_ip' } }
  }

  // ── Couche 2 : quota mensuel de caractères ────────────────────────
  try {
    const used = await monthlyCharsUsed(userId)
    if (used + chars > limit) {
      return {
        ok: false,
        status: 429,
        body: {
          error: 'Quota mensuel de synthèse vocale atteint. La lecture continue avec la voix de ton navigateur.',
          code: 'tts_quota_exceeded',
          used,
          limit,
          tier,
          reset_at: nextMonthISO(),
          upgrade_url: '/settings/subscription',
        },
      }
    }
  } catch {
    // Lecture quota impossible → fail-open (rate-limit déjà passé).
  }

  return { ok: true }
}

/** Enregistre la consommation TTS (best-effort, ne rejette jamais). */
export async function logTtsUsage(userId: string, ip: string | null, chars: number): Promise<void> {
  await logUsage(userId, 'tts', { chars, ip: ip ?? undefined })
}
