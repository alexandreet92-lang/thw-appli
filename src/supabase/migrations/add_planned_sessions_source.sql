-- ═══════════════════════════════════════════════════════════════════
-- add_planned_sessions_source.sql
-- Ajoute une colonne `source` (text nullable) à planned_sessions pour
-- tracer l'origine de chaque séance planifiée :
--   - 'training_plan' : séance générée par l'agent Coach IA
--   - 'session_builder' : séance créée via le constructeur
--   - 'manual' : séance ajoutée à la main dans /planning
--   - NULL : rétrocompat sur les rows existants
-- Idempotent : IF NOT EXISTS.
-- ═══════════════════════════════════════════════════════════════════

ALTER TABLE public.planned_sessions
  ADD COLUMN IF NOT EXISTS source text;

COMMENT ON COLUMN public.planned_sessions.source IS
  'Origine de la séance : training_plan | session_builder | manual | NULL';

-- Index léger pour les filtres par origine (reporting, debug)
CREATE INDEX IF NOT EXISTS idx_planned_sessions_source
  ON public.planned_sessions (source)
  WHERE source IS NOT NULL;
