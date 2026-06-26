-- Types d'entraînement par activité (Force, PMA, EF…) persistés en base
-- (auparavant localStorage) → affichables sur les cartes, multi-appareils.
ALTER TABLE public.activity_extras ADD COLUMN IF NOT EXISTS workout_types jsonb;

-- Objectifs hebdomadaires de l'athlète (séances, volume horaire, distances/sport).
CREATE TABLE IF NOT EXISTS public.training_goals (
  user_id           uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  sessions_per_week integer,
  weekly_hours      numeric,
  distances         jsonb,   -- { run: km, bike: km, swim: km, rowing: km, ski: km }
  updated_at        timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.training_goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own training_goals" ON public.training_goals
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
