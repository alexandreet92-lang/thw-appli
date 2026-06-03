-- Élargit le CHECK constraint event_type pour autoriser les records
-- auto-détectés depuis les activités (processBikeActivityRecords).
-- Sans ça, tout INSERT avec event_type='auto_session' est rejeté en
-- silence (PG code 23514) → les records auto n'arrivent jamais en DB.

ALTER TABLE personal_records
  DROP CONSTRAINT IF EXISTS personal_records_event_type_check;

ALTER TABLE personal_records
  ADD CONSTRAINT personal_records_event_type_check
  CHECK (event_type IN ('training', 'competition', 'auto_session'));
