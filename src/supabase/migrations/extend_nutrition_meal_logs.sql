-- Extend nutrition_meal_logs with new columns for the Repas de la journée refonte
ALTER TABLE nutrition_meal_logs
  ADD COLUMN IF NOT EXISTS meal_name   text,
  ADD COLUMN IF NOT EXISTS photo_url   text,
  ADD COLUMN IF NOT EXISTS ingredients jsonb,
  ADD COLUMN IF NOT EXISTS source      text DEFAULT 'manual';

-- Partial unique index for manual entries (plan_id IS NULL)
-- Postgres treats NULLs as distinct in standard unique indexes,
-- so we add a partial index to enforce one entry per slot per day when plan_id is null.
CREATE UNIQUE INDEX IF NOT EXISTS nutrition_meal_logs_null_plan_slot
  ON nutrition_meal_logs(user_id, date, meal_slot)
  WHERE plan_id IS NULL;
