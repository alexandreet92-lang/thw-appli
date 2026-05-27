ALTER TABLE workout_sessions
  ADD COLUMN IF NOT EXISTS opponent_name text,
  ADD COLUMN IF NOT EXISTS partner_name text,
  ADD COLUMN IF NOT EXISTS match_result text,
  ADD COLUMN IF NOT EXISTS match_score jsonb,
  ADD COLUMN IF NOT EXISTS court_surface text,
  ADD COLUMN IF NOT EXISTS court_location text;
