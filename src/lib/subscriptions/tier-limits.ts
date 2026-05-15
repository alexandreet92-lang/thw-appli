// ══════════════════════════════════════════════════════════════════
// TIER LIMITS — Configuration des quotas par abonnement THW Coaching
// Premium €14/mois · Pro €26/mois · Expert €49/mois
// ══════════════════════════════════════════════════════════════════

export const TIER_LIMITS = {
  // Essai 14 jours — mêmes capacités que Premium
  trial: {
    // ── IA ──────────────────────────────────────────────────────
    messages_per_month: 30,
    messages_per_conversation: 15,
    plans_per_month: 2,
    tool_use_per_month: 50,
    nutrition_plans_per_month: 1,
    // ── Briefing ─────────────────────────────────────────────────
    briefings_per_week: 4,
    briefing_web_search: false,
    // ── Modèle ───────────────────────────────────────────────────
    model: 'hermes' as const,
    // ── Données ──────────────────────────────────────────────────
    history_months: 6,
    strava_sync_per_month: 100,
    storage_gb: 1,
    conversations_history_days: 90,
  },

  premium: {
    // ── IA ──────────────────────────────────────────────────────
    messages_per_month: 30,             // messages chat + micro_agents combinés
    messages_per_conversation: 15,
    plans_per_month: 2,
    tool_use_per_month: 50,
    nutrition_plans_per_month: 1,
    // ── Briefing ─────────────────────────────────────────────────
    briefings_per_week: 4,
    briefing_web_search: false,         // Sonnet sans web_search (~$0.03/appel)
    // ── Modèle ───────────────────────────────────────────────────
    model: 'hermes' as const,           // Haiku
    // ── Données ──────────────────────────────────────────────────
    history_months: 6,
    strava_sync_per_month: 100,
    storage_gb: 1,
    conversations_history_days: 90,
  },

  pro: {
    // ── IA ──────────────────────────────────────────────────────
    messages_per_month: 100,
    messages_per_conversation: 25,
    plans_per_month: 6,
    tool_use_per_month: 150,
    nutrition_plans_per_month: 3,
    // ── Briefing ─────────────────────────────────────────────────
    briefings_per_week: 7,              // quotidien
    briefing_web_search: true,          // Sonnet + web_search (~$0.10/appel)
    // ── Modèle ───────────────────────────────────────────────────
    model: 'athena' as const,           // Sonnet 4.6
    // ── Données ──────────────────────────────────────────────────
    history_months: 24,
    strava_sync_per_month: Infinity,
    storage_gb: 5,
    conversations_history_days: 180,
  },

  expert: {
    // ── IA (soft caps) ───────────────────────────────────────────
    messages_per_month: 300,
    messages_per_conversation: 50,
    plans_per_month: 20,
    tool_use_per_month: 400,
    nutrition_plans_per_month: 10,
    // ── Briefing ─────────────────────────────────────────────────
    briefings_per_week: 7,              // quotidien + prioritaire
    briefing_web_search: true,
    // ── Modèle ───────────────────────────────────────────────────
    model: 'zeus' as const,             // Sonnet 4.6 contexte max
    // ── Données ──────────────────────────────────────────────────
    history_months: Infinity,
    strava_sync_per_month: Infinity,
    storage_gb: 20,
    conversations_history_days: Infinity,
  },
} as const

export type TierName = keyof typeof TIER_LIMITS  // 'trial' | 'premium' | 'pro' | 'expert'
export type TierModel = typeof TIER_LIMITS[TierName]['model']

// ── Mapping modèle → identifiant Anthropic ─────────────────────────
export const MODEL_IDS: Record<TierModel, string> = {
  hermes: 'claude-haiku-4-5-20251001',
  athena: 'claude-sonnet-4-6',
  zeus:   'claude-sonnet-4-6',   // même modèle, contexte + créativité max
}

// ── Mapping modèle → max_tokens Anthropic ──────────────────────────
// Zeus bénéficie d'un contexte étendu pour des analyses longues.
export const MODEL_MAX_TOKENS: Record<TierModel, number> = {
  hermes:  8192,   // min 8k pour les plans détaillés (recharge, stratégie…)
  athena: 12000,   // augmenté pour la stratégie de course (3 scénarios JSON ~8k tokens)
  zeus:   16000,
}

// ── Helpers ────────────────────────────────────────────────────────

/** Retourne les limites pour un tier donné */
export function getLimits(tier: TierName) {
  return TIER_LIMITS[tier]
}

/** Limite en mois (Infinity → null pour les requêtes SQL) */
export function historyMonthsOrNull(tier: TierName): number | null {
  const v = TIER_LIMITS[tier].history_months
  return isFinite(v) ? v : null
}
