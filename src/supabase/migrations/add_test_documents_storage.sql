-- Migration: bucket Supabase Storage pour les documents de test + colonne documents
-- Created: 2026-05-14

-- Bucket privé (20 MB max, formats courants)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'test-documents',
  'test-documents',
  false,
  20971520,
  ARRAY['image/jpeg','image/png','image/webp','image/gif','application/pdf','text/plain',
        'application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document']
)
ON CONFLICT (id) DO NOTHING;

-- RLS Storage : isolement par user (dossier = user_id)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage' AND policyname = 'test_documents_select') THEN
    CREATE POLICY test_documents_select ON storage.objects
      FOR SELECT USING (bucket_id = 'test-documents' AND auth.uid()::text = (storage.foldername(name))[1]);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage' AND policyname = 'test_documents_insert') THEN
    CREATE POLICY test_documents_insert ON storage.objects
      FOR INSERT WITH CHECK (bucket_id = 'test-documents' AND auth.uid()::text = (storage.foldername(name))[1]);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage' AND policyname = 'test_documents_delete') THEN
    CREATE POLICY test_documents_delete ON storage.objects
      FOR DELETE USING (bucket_id = 'test-documents' AND auth.uid()::text = (storage.foldername(name))[1]);
  END IF;
END $$;

-- Colonne documents sur test_results
ALTER TABLE test_results ADD COLUMN IF NOT EXISTS documents JSONB NOT NULL DEFAULT '[]';
