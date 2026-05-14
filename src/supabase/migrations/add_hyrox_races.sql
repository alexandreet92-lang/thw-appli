-- Migration: table hyrox_races
-- Created: 2026-05-14

CREATE TABLE IF NOT EXISTS hyrox_races (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date            DATE NOT NULL,
  format          TEXT NOT NULL CHECK (format IN ('solo_open','solo_pro','duo_open','duo_pro')),
  partenaire      TEXT,
  temps_final     TEXT NOT NULL,
  temps_run_total TEXT,
  stations        JSONB NOT NULL DEFAULT '{}',
  runs            TEXT[] NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS hyrox_races_user_date_idx ON hyrox_races(user_id, date DESC);
ALTER TABLE hyrox_races ENABLE ROW LEVEL SECURITY;
