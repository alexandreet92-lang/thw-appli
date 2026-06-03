-- Pipeline records de puissance auto : suivi d'idempotence + payload des records
-- battus par activité. Indispensable à process-records & backfill-records.
-- Note : la prod utilise DEFAULT '[]'::jsonb pour records_beaten
-- (vérifié via information_schema.columns) — ce fichier reflète la prod.
ALTER TABLE activities
  ADD COLUMN IF NOT EXISTS records_processed boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS records_beaten    jsonb    DEFAULT '[]'::jsonb;

-- Index partiel : accélère la sélection des activités non encore traitées (backfill).
CREATE INDEX IF NOT EXISTS idx_activities_records_processed
  ON activities (records_processed)
  WHERE records_processed = false;
