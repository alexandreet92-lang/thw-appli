-- ══════════════════════════════════════════════════════════════
-- NOTIFICATIONS — fil de notifications in-app (alertes adaptatives)
--
-- Première vraie table de notifications (l'overlay existant était un
-- placeholder). Sert d'abord à l'auto-adaptation du plan nutrition quand
-- l'entraînement change, puis à toute alerte adaptative future.
--
-- dedup_key : permet de remplacer une notif non lue par sa version plus
-- récente (ex. plusieurs ajustements du même jour) au lieu d'empiler.
-- ══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,                 -- 'nutrition_adapt' | …
  title TEXT NOT NULL,
  body TEXT,
  link TEXT,                          -- route à ouvrir au clic (ex: /nutrition)
  dedup_key TEXT,                     -- ex: 'nutri:2026-06-23'
  read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_dedup ON notifications(user_id, dedup_key) WHERE dedup_key IS NOT NULL;

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own notifications" ON notifications;
CREATE POLICY "Users read own notifications" ON notifications
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users insert own notifications" ON notifications;
CREATE POLICY "Users insert own notifications" ON notifications
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update own notifications" ON notifications;
CREATE POLICY "Users update own notifications" ON notifications
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users delete own notifications" ON notifications;
CREATE POLICY "Users delete own notifications" ON notifications
  FOR DELETE USING (auth.uid() = user_id);
