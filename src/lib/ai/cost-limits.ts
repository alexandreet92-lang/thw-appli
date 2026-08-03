// ══════════════════════════════════════════════════════════════════
// COST LIMITS — seuils anti-abus des postes IA NON plafonnés par le
// budget de tokens pondérés (TTS OpenAI + web_search Anthropic).
//
// ⚠️ POINT UNIQUE DE RÉGLAGE : ajuste les valeurs ici (ou via variables
// d'env) sans fouiller le reste du code. Fichier PUR (aucun import
// serveur) → importable partout (routes, composants, tests).
//
// Contexte : `/api/tts` et `web_search` sont facturés HORS du budget de
// tokens. Sans garde, un compte (même Free, 0 €) peut générer une
// facture OpenAI/Anthropic illimitée (« denial of wallet »).
// ══════════════════════════════════════════════════════════════════

import type { TierName } from '@/lib/subscriptions/tier-limits'

// Petit helper : lit un entier depuis une variable d'env, sinon défaut.
function envInt(name: string, fallback: number): number {
  const v = process.env[name]
  if (v == null || v === '') return fallback
  const n = Number.parseInt(v, 10)
  return Number.isFinite(n) ? n : fallback
}

// ── TTS ─────────────────────────────────────────────────────────────

/**
 * Quota MENSUEL de caractères synthétisés par tier (reset le 1er du mois).
 * On plafonne les CARACTÈRES (et non les appels) car la voix est streamée
 * phrase par phrase : 1 réponse coach = plusieurs appels courts
 * (voir VoiceConversation.tsx). Le coût OpenAI est ~proportionnel aux
 * caractères (tts-1 ≈ 15 $/1M car ; gpt-4o-mini-tts moins).
 *
 * 0 = accès TTS coupé pour ce tier (retombe sur la voix navigateur côté client).
 *
 * ── DÉFAUTS PROPOSÉS (à ajuster selon tes vraies factures OpenAI) ──
 *  free    : 0        → BLOQUÉ (0 € de revenu, aucune raison d'assumer un coût OpenAI)
 *  trial   : 30 000   → petite dégustation (~20 réponses) pour la conversion. Mets 0 si tu veux bloquer.
 *  premium : 300 000  → ~200 réponses/mois ; coût OpenAI ≈ 1–4 €/mois (marge préservée sur 14 €)
 *  pro     : 1 000 000
 *  expert  : 2 500 000
 * Coachs : héritent du tier renvoyé par getUserTier (included_tier → premium/pro/expert).
 */
export const TTS_CHARS_PER_MONTH: Record<TierName, number> = {
  free:    envInt('TTS_CHARS_FREE',    0),
  trial:   envInt('TTS_CHARS_TRIAL',   30_000),
  premium: envInt('TTS_CHARS_PREMIUM', 300_000),
  pro:     envInt('TTS_CHARS_PRO',     1_000_000),
  expert:  envInt('TTS_CHARS_EXPERT',  2_500_000),
}

/** Plafond dur de caractères par appel (borne coût/latence unitaire). */
export const TTS_MAX_CHARS_PER_CALL = envInt('TTS_MAX_CHARS_PER_CALL', 4000)

/**
 * Rate-limit (fenêtre glissante 60 s) — défense best-effort en mémoire
 * contre le bouclage. Généreux pour ne PAS casser la voix streamée
 * (une réponse = ~5–15 phrases = autant d'appels rapprochés).
 */
export const TTS_RATE_LIMIT = {
  windowMs:          60_000,
  perAccountPerMin:  envInt('TTS_RATE_ACCOUNT', 60),
  perIpPerMin:       envInt('TTS_RATE_IP',      90),
}

// ── web_search (Anthropic, facturé ~10 $/1000 recherches) ───────────

/** Nombre max de recherches web par message de chat (avant : 5). */
export const WEB_SEARCH_MAX_USES_CHAT = envInt('WEB_SEARCH_MAX_USES_CHAT', 2)

/** Nombre max de recherches web par briefing matinal (avant : 20). */
export const WEB_SEARCH_MAX_USES_BRIEFING = envInt('WEB_SEARCH_MAX_USES_BRIEFING', 5)

/**
 * Tiers autorisés à déclencher web_search dans le CHAT.
 * Réservé aux tiers payants « avancés » (le coût par recherche doit rester
 * corrélé à un abonnement payant). Le compte créateur est autorisé à part.
 * NB : les briefings ont déjà leur propre garde (`briefing_web_search`,
 * true seulement Pro/Expert) → non modifié ici.
 */
export const WEB_SEARCH_CHAT_TIERS: ReadonlySet<TierName> = new Set<TierName>(['pro', 'expert'])
