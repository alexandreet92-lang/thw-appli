-- Activity photos table
CREATE TABLE IF NOT EXISTS activity_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES workout_sessions(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users NOT NULL,
  url text NOT NULL,
  taken_at timestamptz DEFAULT now(),
  lat float8,
  lng float8
);

ALTER TABLE activity_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own photos" ON activity_photos
  FOR ALL USING (auth.uid() = user_id);

-- Storage bucket (run in Supabase dashboard if not already created)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('activity-photos', 'activity-photos', true)
-- ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users upload own photos" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'activity-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Public read activity photos" ON storage.objects
  FOR SELECT USING (bucket_id = 'activity-photos');
