-- Progression Phase A — appliquée sur le projet thw-v2 via MCP.
-- session_families (vide pour l'instant), colonnes EF/Power-HR/découplage,
-- table user_performance (préparée pour la Phase B).

CREATE TABLE IF NOT EXISTS session_families (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id UUID REFERENCES activities(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  sport TEXT NOT NULL,
  family TEXT NOT NULL,
  detected_automatically BOOLEAN DEFAULT TRUE,
  user_override BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(activity_id, family)
);
CREATE INDEX IF NOT EXISTS idx_session_families_user_sport_family ON session_families(user_id, sport, family);
CREATE INDEX IF NOT EXISTS idx_session_families_activity ON session_families(activity_id);
ALTER TABLE session_families ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "session_families_select" ON session_families FOR SELECT USING (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "session_families_cud" ON session_families FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE activities
  ADD COLUMN IF NOT EXISTS ef_value NUMERIC(6,3),
  ADD COLUMN IF NOT EXISTS power_hr_ratio NUMERIC(6,3),
  ADD COLUMN IF NOT EXISTS decoupling_pct NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS ef_calculation_method TEXT;
CREATE INDEX IF NOT EXISTS idx_activities_user_sport_ef ON activities(user_id, sport_type, ef_value);

CREATE TABLE IF NOT EXISTS user_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  ftp INTEGER, vma NUMERIC(4,2), css_pace TEXT,
  threshold_hr INTEGER, max_hr INTEGER, resting_hr INTEGER,
  hyrox_course_pace TEXT, updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE user_performance ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "user_performance_all" ON user_performance FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Backfill agrégats (exécuté une fois) :
-- UPDATE activities SET ef_value = round((((distance_m/moving_time_s)*60)/avg_hr),3),
--   ef_calculation_method='aggregates'
--   WHERE sport_type IN ('run','trail_run') AND avg_hr>0 AND distance_m>0 AND moving_time_s>0;
-- UPDATE activities SET power_hr_ratio = round((avg_watts/avg_hr),3),
--   ef_calculation_method=COALESCE(ef_calculation_method,'aggregates')
--   WHERE sport_type IN ('bike','virtual_bike') AND avg_watts>0 AND avg_hr>0;
