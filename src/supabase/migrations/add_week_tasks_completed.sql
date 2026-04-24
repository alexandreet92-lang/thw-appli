-- ═══════════════════════════════════════════════════════════════════
-- add_week_tasks_completed.sql
-- Ajoute une colonne `completed` (boolean) à week_tasks pour permettre
-- de marquer les tâches comme faites (utilisé par la page /briefing,
-- section Tâches du jour).
-- Idempotent : IF NOT EXISTS sur la colonne.
-- ═══════════════════════════════════════════════════════════════════

ALTER TABLE public.week_tasks
  ADD COLUMN IF NOT EXISTS completed boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.week_tasks.completed IS
  'true si la tâche a été marquée comme faite par l''utilisateur.';
