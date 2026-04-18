-- ══════════════════════════════════════════════════════════════
-- MIGRATION : Données annuelles manuelles — THW Coaching
-- Table : year_data_manual
-- RLS activé, unique (user_id, sport, year), indexes
-- ══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS year_data_manual (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),

  user_id      uuid        NOT NULL
                           REFERENCES auth.users (id)
                           ON DELETE CASCADE,

  -- Sport (running · trail · cycling · swimming · rowing · hyrox · gym · ski)
  sport        text        NOT NULL,

  year         smallint    NOT NULL CHECK (year BETWEEN 2000 AND 2100),

  -- Métriques communes
  km                        numeric(10,2),
  heures                    numeric(8,2),
  denivele                  integer,
  nb_sorties                smallint,
  sortie_plus_longue_km     numeric(8,2),
  sortie_plus_longue_heures numeric(6,2),

  -- Cyclisme uniquement
  tss          integer,

  -- Muscu uniquement
  volume_tonnes numeric(8,2),

  -- Données supplémentaires libres (extensible par sport)
  specifique   jsonb       NOT NULL DEFAULT '{}'::jsonb,

  updated_at   timestamptz NOT NULL DEFAULT now(),

  -- Un seul enregistrement par (user, sport, année)
  UNIQUE (user_id, sport, year)
);

-- ── Trigger updated_at ────────────────────────────────────────
-- La fonction set_updated_at() est créée dans add_tests.sql.
-- CREATE OR REPLACE la recrée sans erreur si elle existe déjà.
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER year_data_manual_updated_at
  BEFORE UPDATE ON year_data_manual
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── Indexes ───────────────────────────────────────────────────
CREATE INDEX idx_year_data_manual_user_id
  ON year_data_manual (user_id);

CREATE INDEX idx_year_data_manual_user_sport
  ON year_data_manual (user_id, sport);

CREATE INDEX idx_year_data_manual_user_sport_year
  ON year_data_manual (user_id, sport, year DESC);

-- ── Row Level Security ────────────────────────────────────────
ALTER TABLE year_data_manual ENABLE ROW LEVEL SECURITY;

CREATE POLICY "year_data_manual_select_own"
  ON year_data_manual FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "year_data_manual_insert_own"
  ON year_data_manual FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "year_data_manual_update_own"
  ON year_data_manual FOR UPDATE
  TO authenticated
  USING  (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "year_data_manual_delete_own"
  ON year_data_manual FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());
