-- ═══════════════════════════════════════════════════════════════════
-- add_plan_id_to_planned_sessions.sql
-- Lie chaque séance à son plan parent (NULL pour séances manuelles
-- ou pré-existantes). ON DELETE SET NULL : si le plan disparaît,
-- les séances restent (l'athlète a peut-être déjà commencé).
-- ═══════════════════════════════════════════════════════════════════

ALTER TABLE public.planned_sessions
  ADD COLUMN IF NOT EXISTS plan_id uuid REFERENCES public.training_plans(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_planned_sessions_plan_id
  ON public.planned_sessions (plan_id)
  WHERE plan_id IS NOT NULL;

COMMENT ON COLUMN public.planned_sessions.plan_id IS
  'FK vers training_plans. NULL = séance manuelle ou orpheline (plan supprimé).';
