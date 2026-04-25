-- ═══════════════════════════════════════════════════════════════════
-- add_training_plans_table.sql
-- Table racine pour les plans d'entraînement (générés par IA ou manuels).
-- Une ligne = un plan complet (nom, objectif, durée, périodisation,
-- conseils, points clés, ai_context pour la mémoire du chat).
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.training_plans (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name                  text NOT NULL,
  objectif_principal    text,
  duree_semaines        integer NOT NULL,
  start_date            date NOT NULL,                  -- lundi de S1
  end_date              date NOT NULL,                  -- dimanche de S_duree
  sports                text[] NOT NULL DEFAULT '{}',
  blocs_periodisation   jsonb NOT NULL DEFAULT '[]'::jsonb,
  conseils_adaptation   jsonb NOT NULL DEFAULT '[]'::jsonb,
  points_cles           jsonb NOT NULL DEFAULT '[]'::jsonb,
  ai_context            jsonb,                          -- { questionnaire, program }
  status                text NOT NULL DEFAULT 'active', -- 'active' | 'archived' | 'completed'
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_training_plans_user_id
  ON public.training_plans (user_id);
CREATE INDEX IF NOT EXISTS idx_training_plans_user_status
  ON public.training_plans (user_id, status);
CREATE INDEX IF NOT EXISTS idx_training_plans_dates
  ON public.training_plans (user_id, start_date, end_date);

-- RLS
ALTER TABLE public.training_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tp_select_own" ON public.training_plans;
CREATE POLICY "tp_select_own" ON public.training_plans
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "tp_insert_own" ON public.training_plans;
CREATE POLICY "tp_insert_own" ON public.training_plans
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "tp_update_own" ON public.training_plans;
CREATE POLICY "tp_update_own" ON public.training_plans
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "tp_delete_own" ON public.training_plans;
CREATE POLICY "tp_delete_own" ON public.training_plans
  FOR DELETE USING (auth.uid() = user_id);

COMMENT ON TABLE public.training_plans IS
  'Plans d''entraînement : un plan = un jeu de séances liées par plan_id sur planned_sessions.';
COMMENT ON COLUMN public.training_plans.ai_context IS
  'Snapshot complet du contexte de génération IA : { questionnaire, program } pour mémoire chat.';
COMMENT ON COLUMN public.training_plans.status IS
  'active | archived | completed. Un seul ''active'' par user (enforcé côté app).';
