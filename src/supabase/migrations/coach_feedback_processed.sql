-- ══════════════════════════════════════════════════════════════
-- COACH FEEDBACK — marqueur d'idempotence pour la distillation (phase 3)
-- processed_at : rempli quand un retour a été pris en compte par le job
-- de distillation, pour ne jamais le re-traiter.
-- ══════════════════════════════════════════════════════════════

ALTER TABLE coach_feedback ADD COLUMN IF NOT EXISTS processed_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_coach_feedback_unprocessed
  ON coach_feedback(created_at) WHERE processed_at IS NULL;
