-- Migration: performance_scores — radar chart athlete profiling
-- Created: 2026-05-14

CREATE TABLE IF NOT EXISTS performance_scores (
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sport      TEXT NOT NULL,
  axis       TEXT NOT NULL,
  raw_value  NUMERIC NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, sport, axis)
);

ALTER TABLE performance_scores ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'performance_scores' AND policyname = 'performance_scores_select'
  ) THEN
    CREATE POLICY performance_scores_select ON performance_scores
      FOR SELECT USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'performance_scores' AND policyname = 'performance_scores_upsert'
  ) THEN
    CREATE POLICY performance_scores_upsert ON performance_scores
      FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;
