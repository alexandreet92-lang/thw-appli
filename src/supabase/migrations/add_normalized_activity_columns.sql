-- ══════════════════════════════════════════════════════════════════
-- Migration : add_normalized_activity_columns
-- Ajoute les colonnes normalisées (noms cohérents avec l'API Strava)
-- à côté des anciennes colonnes abrégées (avg_hr, max_hr, avg_speed_ms).
-- Les anciennes colonnes sont conservées pour rétrocompatibilité.
-- ══════════════════════════════════════════════════════════════════

-- Nouvelles colonnes normalisées
ALTER TABLE public.activities
  ADD COLUMN IF NOT EXISTS average_heartrate  real,
  ADD COLUMN IF NOT EXISTS max_heartrate      real,
  ADD COLUMN IF NOT EXISTS average_speed      real,
  ADD COLUMN IF NOT EXISTS cardiac_drift_pct  real;

-- Backfill depuis les anciennes colonnes (données existantes)
UPDATE public.activities
  SET average_heartrate = avg_hr
  WHERE avg_hr IS NOT NULL AND average_heartrate IS NULL;

UPDATE public.activities
  SET max_heartrate = max_hr
  WHERE max_hr IS NOT NULL AND max_heartrate IS NULL;

UPDATE public.activities
  SET average_speed = avg_speed_ms
  WHERE avg_speed_ms IS NOT NULL AND average_speed IS NULL;
