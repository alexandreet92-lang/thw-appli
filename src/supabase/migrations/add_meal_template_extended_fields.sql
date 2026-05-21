-- Extend nutrition_meal_templates with new fields for the Repas Types section
ALTER TABLE nutrition_meal_templates
  ADD COLUMN IF NOT EXISTS meal_timing                  text,
  ADD COLUMN IF NOT EXISTS photo_url                    text,
  ADD COLUMN IF NOT EXISTS ingredients                  jsonb,
  ADD COLUMN IF NOT EXISTS recommended_frequency_per_week integer,
  ADD COLUMN IF NOT EXISTS is_favorite                  boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS source                       text DEFAULT 'manual';

-- Supabase Storage bucket for meal photos must be created manually in the dashboard:
-- Name: meal-photos, Public: true
-- Or via SQL: INSERT INTO storage.buckets (id, name, public) VALUES ('meal-photos', 'meal-photos', true) ON CONFLICT DO NOTHING;
INSERT INTO storage.buckets (id, name, public)
  VALUES ('meal-photos', 'meal-photos', true)
  ON CONFLICT (id) DO NOTHING;

-- Storage policy: authenticated users can upload to their own folder
CREATE POLICY IF NOT EXISTS "meal_photos_upload"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'meal-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY IF NOT EXISTS "meal_photos_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'meal-photos');

CREATE POLICY IF NOT EXISTS "meal_photos_delete"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'meal-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
