-- Séries RÉELLEMENT réalisées par série/tour (reps, charge, n° de série) de
-- l'enregistreur muscu/hyrox. Sans cette colonne, seul le NOMBRE de séries
-- (sets_completed) était sauvé : la fiche affichait donc le plan initial et
-- non ce qui a été fait (ex. montée de corde 2/3/2 reps selon le tour).
ALTER TABLE public.workout_sessions
  ADD COLUMN IF NOT EXISTS completed_sets jsonb;
