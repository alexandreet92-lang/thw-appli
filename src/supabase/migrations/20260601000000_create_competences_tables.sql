-- Table principale des compétences
CREATE TABLE IF NOT EXISTS competences (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nom                 TEXT NOT NULL,
  description_courte  TEXT NOT NULL,
  bullets             TEXT[] NOT NULL DEFAULT '{}',
  sports              TEXT[] NOT NULL DEFAULT '{}',
  categorie           TEXT NOT NULL,
  prompt_base         TEXT NOT NULL,
  conflits            UUID[] NOT NULL DEFAULT '{}',
  is_predefined       BOOLEAN NOT NULL DEFAULT TRUE,
  created_by          UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT categorie_check CHECK (categorie IN (
    'methodologie',
    'periodisation',
    'adaptation',
    'nutrition',
    'recuperation',
    'force',
    'hypertrophie',
    'performance'
  )),

  CONSTRAINT custom_competence_has_creator CHECK (
    (is_predefined = TRUE AND created_by IS NULL) OR
    (is_predefined = FALSE AND created_by IS NOT NULL)
  )
);

-- Table de relation user <-> competence (état d'activation et perso)
CREATE TABLE IF NOT EXISTS user_competences (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  competence_id   UUID NOT NULL REFERENCES competences(id) ON DELETE CASCADE,
  active          BOOLEAN NOT NULL DEFAULT FALSE,
  prompt_custom   TEXT,
  activated_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(user_id, competence_id)
);

-- Index pour optimiser les requêtes fréquentes
CREATE INDEX IF NOT EXISTS idx_competences_sports ON competences USING GIN(sports);
CREATE INDEX IF NOT EXISTS idx_competences_categorie ON competences(categorie);
CREATE INDEX IF NOT EXISTS idx_competences_is_predefined ON competences(is_predefined);
CREATE INDEX IF NOT EXISTS idx_competences_created_by ON competences(created_by) WHERE created_by IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_user_competences_user_active ON user_competences(user_id, active) WHERE active = TRUE;
CREATE INDEX IF NOT EXISTS idx_user_competences_user ON user_competences(user_id);

-- Trigger pour updated_at automatique
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_competences_updated_at ON competences;
CREATE TRIGGER set_competences_updated_at
  BEFORE UPDATE ON competences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS set_user_competences_updated_at ON user_competences;
CREATE TRIGGER set_user_competences_updated_at
  BEFORE UPDATE ON user_competences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security
ALTER TABLE competences ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_competences ENABLE ROW LEVEL SECURITY;

-- Policy : tout le monde peut lire les compétences prédéfinies
DROP POLICY IF EXISTS "Public read predefined competences" ON competences;
CREATE POLICY "Public read predefined competences"
  ON competences FOR SELECT
  USING (is_predefined = TRUE);

-- Policy : l'utilisateur peut lire ses propres compétences custom
DROP POLICY IF EXISTS "Users read own custom competences" ON competences;
CREATE POLICY "Users read own custom competences"
  ON competences FOR SELECT
  USING (auth.uid() = created_by);

-- Policy : l'utilisateur peut créer ses propres compétences custom
DROP POLICY IF EXISTS "Users create own custom competences" ON competences;
CREATE POLICY "Users create own custom competences"
  ON competences FOR INSERT
  WITH CHECK (auth.uid() = created_by AND is_predefined = FALSE);

-- Policy : l'utilisateur peut modifier ses propres compétences custom
DROP POLICY IF EXISTS "Users update own custom competences" ON competences;
CREATE POLICY "Users update own custom competences"
  ON competences FOR UPDATE
  USING (auth.uid() = created_by AND is_predefined = FALSE);

-- Policy : l'utilisateur peut supprimer ses propres compétences custom
DROP POLICY IF EXISTS "Users delete own custom competences" ON competences;
CREATE POLICY "Users delete own custom competences"
  ON competences FOR DELETE
  USING (auth.uid() = created_by AND is_predefined = FALSE);

-- Policy : l'utilisateur lit/écrit uniquement ses propres user_competences
DROP POLICY IF EXISTS "Users manage own user_competences" ON user_competences;
CREATE POLICY "Users manage own user_competences"
  ON user_competences FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
