-- ══════════════════════════════════════════════════════════════
-- MIGRATION : Table injuries — THW Coaching
-- Blessures avec période (date_debut / date_fin) et type
-- ══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS injuries (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  nom         text        NOT NULL,
  type        text        NOT NULL,          -- muscle, tendon, articulation, os, autre
  date_debut  date        NOT NULL,
  date_fin    date,                           -- NULL = blessure ponctuelle / toujours active
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER injuries_updated_at
  BEFORE UPDATE ON injuries
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX idx_injuries_user_id       ON injuries (user_id);
CREATE INDEX idx_injuries_user_date     ON injuries (user_id, date_debut DESC);

ALTER TABLE injuries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "injuries_select_own" ON injuries FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "injuries_insert_own" ON injuries FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "injuries_update_own" ON injuries FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "injuries_delete_own" ON injuries FOR DELETE TO authenticated USING (user_id = auth.uid());
