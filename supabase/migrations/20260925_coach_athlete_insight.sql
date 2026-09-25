-- ══════════════════════════════════════════════════════════════════════════
-- Coach cockpit — synthèse IA par athlète (lecture déjà faite pour le coach).
-- L'IA lit les données de chaque athlète et produit une synthèse actionnable
-- (état / tendance / risque / action) stockée sur le lien coach↔athlète.
-- Régénérée par cron (nuit) + après analyse auto d'une séance.
-- Colonnes additives et nullables → aucune donnée existante impactée.
-- ══════════════════════════════════════════════════════════════════════════

alter table public.coach_athlete
  -- Synthèse IA « vue coach » : { headline, state, trend, risk, action, priority }
  add column if not exists ai_insight    jsonb,
  add column if not exists ai_insight_at timestamptz;
