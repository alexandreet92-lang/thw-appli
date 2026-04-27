-- ═══════════════════════════════════════════════════════════════════
-- add_training_plan_messages.sql
-- Historique de la conversation Coach IA liée à un training_plan.
-- Chaque message (user ou assistant) est stocké ici pour :
--   - Reprendre la conversation sur un autre appareil / session
--   - Conserver la mémoire du plan complet sans re-prompt
--   - Audit / debug des échanges IA
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.training_plan_messages (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  training_plan_id uuid        NOT NULL REFERENCES public.training_plans(id) ON DELETE CASCADE,
  user_id          uuid        NOT NULL REFERENCES auth.users(id)            ON DELETE CASCADE,
  role             text        NOT NULL CHECK (role IN ('user', 'assistant')),
  content          text        NOT NULL,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tpm_plan_created
  ON public.training_plan_messages (training_plan_id, created_at);

CREATE INDEX IF NOT EXISTS idx_tpm_user_id
  ON public.training_plan_messages (user_id);

ALTER TABLE public.training_plan_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tpm_select_own" ON public.training_plan_messages;
CREATE POLICY "tpm_select_own" ON public.training_plan_messages
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "tpm_insert_own" ON public.training_plan_messages;
CREATE POLICY "tpm_insert_own" ON public.training_plan_messages
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "tpm_delete_own" ON public.training_plan_messages;
CREATE POLICY "tpm_delete_own" ON public.training_plan_messages
  FOR DELETE USING (auth.uid() = user_id);

COMMENT ON TABLE public.training_plan_messages IS
  'Historique conversation Coach IA par plan d''entraînement. Lié à training_plans.id.';
