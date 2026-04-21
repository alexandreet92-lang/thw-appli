CREATE TABLE IF NOT EXISTS session_library (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid        REFERENCES auth.users ON DELETE CASCADE,
  nom           text        NOT NULL,
  sport         text        NOT NULL,
  type_seance   text[],
  sous_type     text,
  duree_estimee integer,
  intensite     text        CHECK (intensite IN ('Faible','Modéré','Élevé','Maximum')),
  tss_estime    integer,
  rpe_cible     integer,
  tags          text[],
  description   text,
  blocs         jsonb,
  source        text        DEFAULT 'ai',
  created_at    timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_session_library_user_id ON session_library(user_id);
CREATE INDEX IF NOT EXISTS idx_session_library_user_created ON session_library(user_id, created_at DESC);
ALTER TABLE session_library ENABLE ROW LEVEL SECURITY;
CREATE POLICY "session_library_own" ON session_library
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
