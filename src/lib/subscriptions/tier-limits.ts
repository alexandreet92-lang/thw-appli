// ══════════════════════════════════════════════════════════════════
// TIER LIMITS — Configuration des quotas par abonnement THW Coaching
// Premium €14/mois · Pro €26/mois · Expert €49/mois
// ══════════════════════════════════════════════════════════════════

export const TIER_LIMITS = {
  // Mode GRATUIT — après les 14 jours d'essai, sans abonnement.
  // L'app reste utilisable (planning, activités, nutrition manuelle, suivi),
  // mais les fonctions IA / premium sont fortement limitées.
  free: {
    // ── IA (très limité) ─────────────────────────────────────────
    messages_per_month: 5,              // aperçu de l'IA seulement
    messages_per_conversation: 5,
    plans_per_month: 0,                 // pas de génération de plan IA
    tool_use_per_month: 5,
    nutrition_plans_per_month: 0,       // pas de plan nutritionnel IA
    memories_max: 0,                    // pas de mémoire long terme
    projects_max: 1,                    // 1 dossier de conversations
    routines_max: 0,                    // pas d'automatisation
    // ── Briefing ─────────────────────────────────────────────────
    briefings_per_week: 0,              // pas de briefing quotidien
    briefing_web_search: false,
    // ── Modèle ───────────────────────────────────────────────────
    model: 'hermes' as const,           // Haiku
    // ── Données ──────────────────────────────────────────────────
    history_months: 1,
    strava_sync_per_month: 20,
    storage_gb: 0.5,
    conversations_history_days: 14,
    // ── Communauté ───────────────────────────────────────────────
    // Participer (lire, poster, réagir, rejoindre) = TOUT LE MONDE (géré hors
    // limites, côté RLS). Ici on ne configure QUE les capacités « créateur /
    // animateur » qui montent avec l'abonnement. Free ne crée rien.
    community_can_create: false,        // créer un espace : Premium minimum
    community_spaces_max: 0,            // quota d'espaces créés
    community_members_max: 0,           // capacité membres d'un espace créé
    community_upload_files: false,      // images/fichiers : Premium+
    community_private_spaces: false,    // espaces sur invitation : Pro+
    community_moderation: false,        // outils owner (épingler, rôles…) : Premium+
    community_branding: false,          // icône/bannière d'espace : Pro+
    community_voice: false,             // canaux vocaux : Pro+ (Phase 2)
    community_verified: false,          // badge vérifié : Expert
  },

  // Essai 14 jours — mêmes capacités que Premium
  trial: {
    // ── IA ──────────────────────────────────────────────────────
    messages_per_month: 30,
    messages_per_conversation: 15,
    plans_per_month: 2,
    tool_use_per_month: 50,
    nutrition_plans_per_month: 1,
    memories_max: 30,                   // mémoire long terme (faits retenus)
    projects_max: 3,                    // dossiers de conversations
    routines_max: 1,                    // automatisations planifiées
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
    // ── Communauté (mêmes capacités que Premium) ─────────────────
    community_can_create: true,
    community_spaces_max: 1,
    community_members_max: 200,
    community_upload_files: true,
    community_private_spaces: false,
    community_moderation: true,
    community_branding: false,
    community_voice: false,
    community_verified: false,
  },

  premium: {
    // ── IA ──────────────────────────────────────────────────────
    messages_per_month: 30,             // messages chat + micro_agents combinés
    messages_per_conversation: 15,
    plans_per_month: 2,
    tool_use_per_month: 50,
    nutrition_plans_per_month: 1,
    memories_max: 30,                   // mémoire long terme (faits retenus)
    projects_max: 3,                    // dossiers de conversations
    routines_max: 1,                    // automatisations planifiées
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
    // ── Communauté ───────────────────────────────────────────────
    community_can_create: true,
    community_spaces_max: 1,            // Premium : 1 espace créé
    community_members_max: 200,         // Premium : jusqu'à 200 membres
    community_upload_files: true,       // images/fichiers
    community_private_spaces: false,    // privé réservé Pro+
    community_moderation: true,         // outils owner de base sur son espace
    community_branding: false,          // branding réservé Pro+
    community_voice: false,             // voix réservée Pro+ (Phase 2)
    community_verified: false,          // badge vérifié réservé Expert
  },

  pro: {
    // ── IA ──────────────────────────────────────────────────────
    messages_per_month: 100,
    messages_per_conversation: 25,
    plans_per_month: 6,
    tool_use_per_month: 150,
    nutrition_plans_per_month: 3,
    memories_max: 200,                  // mémoire long terme (faits retenus)
    projects_max: 20,                   // dossiers de conversations
    routines_max: 5,                    // automatisations planifiées
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
    // ── Communauté ───────────────────────────────────────────────
    community_can_create: true,
    community_spaces_max: 3,            // Pro : jusqu'à 3 espaces créés
    community_members_max: 1000,        // Pro : jusqu'à 1 000 membres
    community_upload_files: true,
    community_private_spaces: true,     // espaces sur invitation
    community_moderation: true,         // modération complète
    community_branding: true,           // icône/bannière d'espace
    community_voice: true,              // canaux vocaux (Phase 2)
    community_verified: false,
  },

  expert: {
    // ── IA (soft caps) ───────────────────────────────────────────
    messages_per_month: 300,
    messages_per_conversation: 50,
    plans_per_month: 20,
    tool_use_per_month: 400,
    nutrition_plans_per_month: 10,
    memories_max: 1000,                 // mémoire long terme (faits retenus)
    projects_max: Infinity,             // dossiers de conversations
    routines_max: 20,                   // automatisations planifiées
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
    // ── Communauté (illimité) ────────────────────────────────────
    community_can_create: true,
    community_spaces_max: Infinity,     // Expert : espaces illimités
    community_members_max: Infinity,    // Expert : membres illimités
    community_upload_files: true,
    community_private_spaces: true,
    community_moderation: true,
    community_branding: true,
    community_voice: true,
    community_verified: true,           // badge vérifié
  },
} as const

export type TierName = keyof typeof TIER_LIMITS  // 'free' | 'trial' | 'premium' | 'pro' | 'expert'
export type TierModel = typeof TIER_LIMITS[TierName]['model']

// PLAFOND de modèle sélectionnable (distinct du modèle par DÉFAUT ci-dessus, qui
// reste sobre pour les tâches de fond). Free = Hermès seul ; les payants (et l'essai)
// peuvent monter jusqu'à Zeus, borné par leur budget de tokens.
export const TIER_MAX_MODEL: Record<TierName, TierModel> = {
  free:    'hermes',
  trial:   'zeus',
  premium: 'zeus',
  pro:     'zeus',
  expert:  'zeus',
}

// ── Mapping modèle → identifiant Anthropic ─────────────────────────
export const MODEL_IDS: Record<TierModel, string> = {
  hermes: 'claude-haiku-4-5-20251001',  // rapide, sobre
  athena: 'claude-sonnet-4-6',          // équilibré
  zeus:   'claude-opus-4-8',            // le plus puissant et précis (raisonnement poussé)
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

// ── Communauté ──────────────────────────────────────────────────────
// Capacités « créateur / animateur » dérivées du tier. Participer (lire,
// poster, réagir, rejoindre) n'est PAS ici : c'est ouvert à tous et géré par
// la RLS. Source unique des règles = les champs community_* de TIER_LIMITS.

export interface CommunityEntitlements {
  canCreate: boolean       // créer un espace / groupe
  maxSpaces: number        // quota d'espaces créés (Infinity = illimité)
  maxMembers: number       // capacité membres d'un espace créé
  canUploadFiles: boolean  // images/fichiers
  canPrivate: boolean      // espaces sur invitation
  canModerate: boolean     // outils owner (épingler, rôles, bannir)
  canBrand: boolean        // icône/bannière d'espace
  canVoice: boolean        // canaux vocaux (Phase 2)
  verified: boolean        // badge vérifié
}

/**
 * Entitlements communauté pour un tier.
 * `unlimited` (compte créateur / pack coach) débride tout, comme pour les quotas IA.
 */
export function communityEntitlements(tier: TierName, unlimited = false): CommunityEntitlements {
  if (unlimited) {
    return {
      canCreate: true, maxSpaces: Infinity, maxMembers: Infinity,
      canUploadFiles: true, canPrivate: true, canModerate: true,
      canBrand: true, canVoice: true, verified: true,
    }
  }
  const l = TIER_LIMITS[tier]
  return {
    canCreate: l.community_can_create,
    maxSpaces: l.community_spaces_max,
    maxMembers: l.community_members_max,
    canUploadFiles: l.community_upload_files,
    canPrivate: l.community_private_spaces,
    canModerate: l.community_moderation,
    canBrand: l.community_branding,
    canVoice: l.community_voice,
    verified: l.community_verified,
  }
}
