-- Migration: climb_records table
-- Created: 2026-05-15

CREATE TABLE IF NOT EXISTS climb_records (
  id                UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name              TEXT         NOT NULL,
  date              DATE         NOT NULL,
  watts_avg         INTEGER      NOT NULL,
  duration_seconds  INTEGER      NOT NULL,
  weight_kg         FLOAT        NOT NULL,
  wpkg              FLOAT        NOT NULL,
  length_km         FLOAT,
  avg_gradient_pct  FLOAT,
  altitude_summit_m INTEGER,
  pre_fatigue       TEXT,        -- 'fresh' | 'light' | 'moderate' | 'high'
  with_nutrition    BOOLEAN      DEFAULT false,
  created_at        TIMESTAMPTZ  DEFAULT now()
);

-- Index for fast user queries
CREATE INDEX IF NOT EXISTS climb_records_user_date_idx
  ON climb_records(user_id, date DESC);

-- RLS
ALTER TABLE climb_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "climb_records_own" ON climb_records
  FOR ALL USING (user_id = auth.uid());
