-- Migration: test_definitions + test_results
-- Created: 2026-05-14

-- 1. Table des définitions de test (catalogue)
CREATE TABLE IF NOT EXISTS test_definitions (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nom        TEXT NOT NULL,
  sport      TEXT NOT NULL,   -- 'running' | 'cycling' | 'natation' | 'aviron' | 'hyrox'
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(nom, sport)
);

-- 2. Table des résultats enregistrés par l'utilisateur
CREATE TABLE IF NOT EXISTS test_results (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  test_definition_id   UUID REFERENCES test_definitions(id) ON DELETE SET NULL,
  date                 DATE NOT NULL DEFAULT CURRENT_DATE,
  valeurs              JSONB NOT NULL DEFAULT '{}',
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Index pour les requêtes fréquentes
CREATE INDEX IF NOT EXISTS test_results_user_id_idx ON test_results(user_id);
CREATE INDEX IF NOT EXISTS test_results_date_idx    ON test_results(date DESC);

-- 4. RLS
ALTER TABLE test_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_results     ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  -- test_definitions : lecture publique (catalogue partagé)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'test_definitions' AND policyname = 'test_definitions_select'
  ) THEN
    CREATE POLICY test_definitions_select ON test_definitions
      FOR SELECT USING (true);
  END IF;

  -- test_results : isolé par user
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'test_results' AND policyname = 'test_results_select'
  ) THEN
    CREATE POLICY test_results_select ON test_results
      FOR SELECT USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'test_results' AND policyname = 'test_results_insert'
  ) THEN
    CREATE POLICY test_results_insert ON test_results
      FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'test_results' AND policyname = 'test_results_delete'
  ) THEN
    CREATE POLICY test_results_delete ON test_results
      FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

-- 5. Seed test_definitions (catalogue exhaustif)
INSERT INTO test_definitions (nom, sport) VALUES
  -- Running
  ('VO2max',            'running'),
  ('VMA',               'running'),
  ('Test lactate',      'running'),
  ('Cooper',            'running'),
  ('TMI',               'running'),
  -- Cycling
  ('CP20',              'cycling'),
  ('Critical Power',    'cycling'),
  ('Lactate',           'cycling'),
  ('Endurance 2h',      'cycling'),
  ('Endurance 4h',      'cycling'),
  ('Endurance Progressive', 'cycling'),
  ('Endurance + FTP',   'cycling'),
  ('VO2max / PMA',      'cycling'),
  ('Wingate',           'cycling'),
  -- Natation
  ('CSS',               'natation'),
  ('VMax',              'natation'),
  ('Hypoxie',           'natation'),
  -- Aviron
  ('2000m',             'aviron'),
  ('Endurance 10000m',  'aviron'),
  ('30 minutes',        'aviron'),
  ('Power',             'aviron'),
  ('VO2max',            'aviron'),
  -- Hyrox
  ('PFT',               'hyrox'),
  ('Station isolée',    'hyrox'),
  ('BBJ 80m',           'hyrox'),
  ('BBJ 200m',          'hyrox'),
  ('BBJ 400m',          'hyrox'),
  ('Farmer Carry',      'hyrox'),
  ('Farmer Carry Max',  'hyrox'),
  ('Wall Ball 100',     'hyrox'),
  ('Wall Ball Max',     'hyrox'),
  ('Wall Ball Tabata',  'hyrox'),
  ('Sled Push',         'hyrox'),
  ('Sled Pull',         'hyrox'),
  ('Run Compromised',   'hyrox')
ON CONFLICT (nom, sport) DO NOTHING;
