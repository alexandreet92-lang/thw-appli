-- ══════════════════════════════════════════════════════════════
-- MIGRATION : Courses Hyrox — THW Coaching
-- Table : hyrox_races
-- RLS activé, indexes sur user_id / date / format
-- ══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS hyrox_races (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),

  user_id         uuid        NOT NULL
                              REFERENCES auth.users (id)
                              ON DELETE CASCADE,

  date            date        NOT NULL,

  -- Format de course
  format          text        NOT NULL
                              CHECK (format IN ('solo_open','solo_pro','duo_open','duo_pro')),

  -- Partenaire (Duo uniquement)
  partenaire      text,

  -- Temps global
  temps_final     text        NOT NULL,
  temps_run_total text,

  -- Temps par station (clé = nom de station, valeur = mm:ss)
  -- ex: {"SkiErg":"3:42","Sled Push":"3:15",...}
  stations        jsonb       NOT NULL DEFAULT '{}'::jsonb,

  -- Temps par run 1km (tableau ordonné, ex: ["4:12","4:08",...])
  runs            jsonb       NOT NULL DEFAULT '[]'::jsonb,

  created_at      timestamptz NOT NULL DEFAULT now()
);

-- ── Indexes ───────────────────────────────────────────────────
CREATE INDEX idx_hyrox_races_user_id
  ON hyrox_races (user_id);

CREATE INDEX idx_hyrox_races_user_date
  ON hyrox_races (user_id, date DESC);

CREATE INDEX idx_hyrox_races_user_format
  ON hyrox_races (user_id, format);

-- ── Row Level Security ────────────────────────────────────────
ALTER TABLE hyrox_races ENABLE ROW LEVEL SECURITY;

CREATE POLICY "hyrox_races_select_own"
  ON hyrox_races FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "hyrox_races_insert_own"
  ON hyrox_races FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "hyrox_races_update_own"
  ON hyrox_races FOR UPDATE
  TO authenticated
  USING  (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "hyrox_races_delete_own"
  ON hyrox_races FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());
