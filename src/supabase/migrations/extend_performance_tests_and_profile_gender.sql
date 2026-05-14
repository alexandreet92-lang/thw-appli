-- Migration: extend performance_tests + add gender to athlete_performance_profile
-- Created: 2026-05-14

ALTER TABLE performance_tests
  ADD COLUMN IF NOT EXISTS value  NUMERIC,
  ADD COLUMN IF NOT EXISTS score  NUMERIC,
  ADD COLUMN IF NOT EXISTS level  TEXT,
  ADD COLUMN IF NOT EXISTS gender TEXT DEFAULT 'm';

CREATE INDEX IF NOT EXISTS performance_tests_user_sport_idx
  ON performance_tests(user_id, sport, test_type);

ALTER TABLE athlete_performance_profile
  ADD COLUMN IF NOT EXISTS gender TEXT DEFAULT 'm';
