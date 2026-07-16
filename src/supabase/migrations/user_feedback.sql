-- ══════════════════════════════════════════════════════════════
-- USER FEEDBACK — messages des utilisateurs vers le créateur
--
-- L'utilisateur peut envoyer une remarque : amélioration, bug/problème,
-- ce qu'il aime, ou autre. Ces messages sont lus par le créateur dans la
-- page Cockpit (/admin) via le service role (bypass RLS).
-- ══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS user_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_email TEXT,                             -- dénormalisé pour l'affichage admin
  category TEXT NOT NULL CHECK (category IN ('amelioration', 'bug', 'jaime', 'autre')),
  message TEXT NOT NULL,
  page TEXT,                                   -- page depuis laquelle le message a été envoyé (contexte)
  resolved BOOLEAN NOT NULL DEFAULT FALSE,     -- traité côté créateur
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_feedback_created ON user_feedback(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_feedback_category ON user_feedback(category, resolved);

-- RLS : l'utilisateur insère / lit SES propres messages.
-- La lecture admin (Cockpit) passe par le service role (bypass RLS).
ALTER TABLE user_feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users insert own feedback" ON user_feedback;
CREATE POLICY "Users insert own feedback" ON user_feedback
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users read own feedback" ON user_feedback;
CREATE POLICY "Users read own feedback" ON user_feedback
  FOR SELECT USING (auth.uid() = user_id);
