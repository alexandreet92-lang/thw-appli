-- Table mesures corporelles (remplace nutrition_weight_logs)
CREATE TABLE IF NOT EXISTS body_measurements (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid        REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  measured_at     date        NOT NULL,
  weight_kg       numeric(5,2),
  fat_mass_percent numeric(4,2),
  muscle_mass_kg  numeric(5,2),
  source          text        DEFAULT 'manual',
  created_at      timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS body_measurements_user_date
  ON body_measurements(user_id, measured_at);

CREATE INDEX IF NOT EXISTS idx_body_measurements_user
  ON body_measurements(user_id, measured_at DESC);

ALTER TABLE body_measurements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own measurements"
  ON body_measurements FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
