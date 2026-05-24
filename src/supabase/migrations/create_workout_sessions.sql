-- Migration: workout_sessions + sport_page_configs
-- A exécuter manuellement via le SQL editor Supabase.

CREATE TABLE IF NOT EXISTS workout_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  sport text not null,
  started_at timestamptz not null,
  ended_at timestamptz,
  duration_seconds integer,
  distance_m numeric(10,2) default 0,
  elevation_gain_m numeric(8,2) default 0,
  avg_speed_kmh numeric(6,2),
  max_speed_kmh numeric(6,2),
  avg_hr integer,
  calories integer,
  gps_track jsonb default '[]',
  laps jsonb default '[]',
  strava_activity_id text,
  status text default 'recording',
  created_at timestamptz default now()
);
ALTER TABLE workout_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own sessions" ON workout_sessions
  FOR ALL USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS sport_page_configs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  sport text not null,
  pages jsonb not null default '[]',
  created_at timestamptz default now(),
  UNIQUE(user_id, sport)
);
ALTER TABLE sport_page_configs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own configs" ON sport_page_configs
  FOR ALL USING (auth.uid() = user_id);
