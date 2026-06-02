-- Préférences de notifications (UI seulement en V1 ; envoi réel plus tard).
-- preferences = JSONB { "categorie.nom": bool }. Clés STABLES (ne pas renommer
-- sans migration une fois en prod).
CREATE TABLE IF NOT EXISTS user_notification_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  global_enabled BOOLEAN DEFAULT TRUE,
  preferences JSONB DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE user_notification_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own notification prefs" ON user_notification_preferences;
CREATE POLICY "Users manage own notification prefs"
  ON user_notification_preferences USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION create_user_notif_prefs()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_notification_preferences (user_id, preferences)
  VALUES (NEW.id, '{}'::jsonb)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created_notif ON auth.users;
CREATE TRIGGER on_auth_user_created_notif
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_user_notif_prefs();
