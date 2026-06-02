-- Matériel : vélos + chaussures running. Stats calculées dynamiquement depuis
-- activities via strava_gear_id (pas de colonnes de stats stockées).
CREATE TABLE IF NOT EXISTS user_bikes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  brand TEXT,
  model TEXT,
  weight_kg NUMERIC(5,2),
  strava_gear_id TEXT,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_user_bikes_user ON user_bikes(user_id);
CREATE INDEX IF NOT EXISTS idx_user_bikes_strava ON user_bikes(strava_gear_id) WHERE strava_gear_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS user_running_shoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  brand TEXT,
  strava_gear_id TEXT,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_user_shoes_user ON user_running_shoes(user_id);

-- Lien activité ↔ matériel (rempli plus tard par la sync Strava)
ALTER TABLE activities ADD COLUMN IF NOT EXISTS strava_gear_id TEXT;
CREATE INDEX IF NOT EXISTS idx_activities_gear ON activities(strava_gear_id) WHERE strava_gear_id IS NOT NULL;

ALTER TABLE user_bikes ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_running_shoes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own bikes" ON user_bikes;
CREATE POLICY "Users manage own bikes" ON user_bikes
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users manage own shoes" ON user_running_shoes;
CREATE POLICY "Users manage own shoes" ON user_running_shoes
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
