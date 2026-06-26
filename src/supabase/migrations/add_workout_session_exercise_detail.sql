-- Détail des exercices réalisés en séance in-app (enregistreur muscu/hyrox).
-- Ces colonnes manquaient → l'insert de WorkoutSession.handleSave échouait
-- (Postgres rejette une colonne inconnue), donc aucune séance ne se sauvait.
ALTER TABLE public.workout_sessions
  ADD COLUMN IF NOT EXISTS exercises_detail jsonb,
  ADD COLUMN IF NOT EXISTS total_volume_kg  numeric,
  ADD COLUMN IF NOT EXISTS sets_completed   integer;
