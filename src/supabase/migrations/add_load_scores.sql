-- ════════════════════════════════════════════════════════════════
-- Système de charge — deux scores (SM métabolique / SN neuromusculaire)
-- Décisions : stocker SM/SN par activité, conserver le TSS (CTL/ATL inchangés) ;
-- ajouter les benchmarks manquants (p5s, 1RM) à athlete_performance_profile.
-- Idempotent. Aucun calcul ici (les scores sont calculés côté app, déterministes).
-- ════════════════════════════════════════════════════════════════

-- Scores par activité (0–100). NULL tant que non calculé.
ALTER TABLE activities
  ADD COLUMN IF NOT EXISTS sm_score smallint,
  ADD COLUMN IF NOT EXISTS sn_score smallint;

COMMENT ON COLUMN activities.sm_score IS 'Score métabolique 0-100 (cardio/glycolytique), déterministe';
COMMENT ON COLUMN activities.sn_score IS 'Score neuromusculaire 0-100 (mécanique/explosif), déterministe';

-- Benchmarks manquants pour les scores (puissance 5 s vélo + 1RM muscu par exercice).
ALTER TABLE athlete_performance_profile
  ADD COLUMN IF NOT EXISTS p5s_watts        numeric,
  ADD COLUMN IF NOT EXISTS one_rm_estimates jsonb;

COMMENT ON COLUMN athlete_performance_profile.p5s_watts IS 'Puissance max 5 secondes (W) — score neuromusculaire vélo';
COMMENT ON COLUMN athlete_performance_profile.one_rm_estimates IS '1RM estimés par exercice muscu, ex: {"squat":140,"bench":100}';
