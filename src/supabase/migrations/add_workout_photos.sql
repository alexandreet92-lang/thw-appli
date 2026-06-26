-- Photos de séance in-app : URLs (jsonb) sur workout_sessions + bucket dédié
-- 'workout-photos' (public en lecture, écriture/suppression scoping user via le
-- 1er segment du chemin = auth.uid()).
ALTER TABLE public.workout_sessions ADD COLUMN IF NOT EXISTS photos jsonb;

INSERT INTO storage.buckets (id, name, public)
VALUES ('workout-photos', 'workout-photos', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "workout photos insert own" ON storage.objects;
CREATE POLICY "workout photos insert own" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'workout-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "workout photos read" ON storage.objects;
CREATE POLICY "workout photos read" ON storage.objects
  FOR SELECT USING (bucket_id = 'workout-photos');

DROP POLICY IF EXISTS "workout photos delete own" ON storage.objects;
CREATE POLICY "workout photos delete own" ON storage.objects
  FOR DELETE USING (bucket_id = 'workout-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
