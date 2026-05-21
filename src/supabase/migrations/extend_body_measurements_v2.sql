-- Extend body_measurements with metabolic_age + notes
ALTER TABLE body_measurements
  ADD COLUMN IF NOT EXISTS metabolic_age integer,
  ADD COLUMN IF NOT EXISTS notes text;
-- IMC is NOT stored, computed at display time from weight_kg and profile.height_cm
