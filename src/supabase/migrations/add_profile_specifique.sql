-- Migration: add profile specifique + extend athlete_performance_profile
-- Created: 2026-05-14

-- 1. Ajouter les colonnes manquantes sur athlete_performance_profile
ALTER TABLE athlete_performance_profile
  ADD COLUMN IF NOT EXISTS vma_km_h          NUMERIC,
  ADD COLUMN IF NOT EXISTS vo2max_ml_kg_min   NUMERIC,
  ADD COLUMN IF NOT EXISTS age_years          INTEGER;

-- 2. Table profil spécifique par sport (benchmarks personnels, distinct des records de compétition)
CREATE TABLE IF NOT EXISTS athlete_sport_profile (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sport      TEXT NOT NULL,   -- 'running' | 'cycling' | 'swimming' | 'hyrox'
  params     JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, sport)
);

-- 3. RLS
ALTER TABLE athlete_sport_profile ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'athlete_sport_profile' AND policyname = 'athlete_sport_profile_select'
  ) THEN
    CREATE POLICY athlete_sport_profile_select ON athlete_sport_profile
      FOR SELECT USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'athlete_sport_profile' AND policyname = 'athlete_sport_profile_upsert'
  ) THEN
    CREATE POLICY athlete_sport_profile_upsert ON athlete_sport_profile
      FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;
