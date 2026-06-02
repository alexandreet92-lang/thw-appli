-- Add records_processed flag + records_beaten cache to activities.
-- Used by /api/activities/process-records to avoid re-processing
-- the MMP→personal_records auto-update on each view.

ALTER TABLE activities
  ADD COLUMN IF NOT EXISTS records_processed BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS records_beaten    JSONB   DEFAULT NULL;

-- Optional index to speed up bulk back-processing if ever needed.
CREATE INDEX IF NOT EXISTS idx_activities_records_unprocessed
  ON activities (user_id)
  WHERE records_processed = FALSE;
