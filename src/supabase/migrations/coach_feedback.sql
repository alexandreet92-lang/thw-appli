-- ══════════════════════════════════════════════════════════════
-- COACH FEEDBACK — signal qualité 👍/👎 sur les réponses du coach IA
--
-- Phase 1 de la couche d'apprentissage : on capte, pour chaque réponse
-- du coach, un retour explicite de l'athlète. C'est le carburant qui
-- alimentera ensuite la distillation d'« insights » (phases suivantes).
--
-- Un seul retour par message (UNIQUE user_id, message_id) → l'athlète
-- peut basculer 👍↔👎 (upsert). message_id = id client de l'AIMsg.
-- ══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS coach_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  conversation_id TEXT,                       -- ai_conversations.data.id (id client)
  message_id TEXT NOT NULL,                   -- AIMsg.id côté front
  sport TEXT,                                 -- running|cycling|hyrox|gym | null
  model TEXT,                                 -- hermes|athena|zeus
  rating SMALLINT NOT NULL CHECK (rating IN (-1, 1)),
  reason TEXT,                                -- motif optionnel (libre)
  user_message TEXT,                          -- question posée (contexte)
  assistant_message TEXT,                     -- réponse jugée (contexte)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, message_id)
);

CREATE INDEX IF NOT EXISTS idx_coach_feedback_created ON coach_feedback(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_coach_feedback_rating_sport ON coach_feedback(rating, sport);

-- RLS : l'athlète lit / écrit / met à jour SES propres retours.
-- La lecture admin (page de curation) passe par le service role (bypass RLS).
ALTER TABLE coach_feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own coach feedback" ON coach_feedback;
CREATE POLICY "Users read own coach feedback" ON coach_feedback
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users insert own coach feedback" ON coach_feedback;
CREATE POLICY "Users insert own coach feedback" ON coach_feedback
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update own coach feedback" ON coach_feedback;
CREATE POLICY "Users update own coach feedback" ON coach_feedback
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
