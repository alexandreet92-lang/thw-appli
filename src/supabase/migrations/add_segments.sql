-- Segments GPS
CREATE TABLE IF NOT EXISTS segments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  name text NOT NULL,
  sport text NOT NULL DEFAULT 'cycling',
  is_public boolean DEFAULT false,
  points jsonb NOT NULL DEFAULT '[]',
  distance_m float8 DEFAULT 0,
  elevation_gain_m float8 DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE segments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "segments_select" ON segments FOR SELECT
  USING (user_id = auth.uid() OR is_public = true);
CREATE POLICY "segments_insert" ON segments FOR INSERT
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "segments_update" ON segments FOR UPDATE
  USING (user_id = auth.uid());
CREATE POLICY "segments_delete" ON segments FOR DELETE
  USING (user_id = auth.uid());

-- Efforts sur segments
CREATE TABLE IF NOT EXISTS segment_efforts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  segment_id uuid REFERENCES segments(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users NOT NULL,
  activity_id uuid REFERENCES workout_sessions(id) ON DELETE SET NULL,
  started_at timestamptz NOT NULL,
  duration_seconds integer NOT NULL,
  distance_m float8 NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE segment_efforts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "efforts_select" ON segment_efforts FOR SELECT
  USING (user_id = auth.uid());
CREATE POLICY "efforts_insert" ON segment_efforts FOR INSERT
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "efforts_delete" ON segment_efforts FOR DELETE
  USING (user_id = auth.uid());
