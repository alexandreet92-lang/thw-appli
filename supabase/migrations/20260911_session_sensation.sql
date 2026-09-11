-- ════════════════════════════════════════════════════════════════════
-- Ressenti (sensation) de la séance — note /5 saisie dans le résumé d'activité
-- (0 = mauvaises sensations, 5 = excellentes). Complète `rpe` (difficulté /10)
-- déjà présent. Colonne nullable : les séances existantes restent valides.
-- ════════════════════════════════════════════════════════════════════
alter table public.workout_sessions
  add column if not exists sensation numeric;

comment on column public.workout_sessions.sensation
  is 'Ressenti de la séance /5 (0 = mauvais, 5 = excellent). Saisi dans le résumé.';
