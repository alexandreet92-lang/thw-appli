-- Table de profil utilisateur
CREATE TABLE IF NOT EXISTS profiles (
  user_id          uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  first_name       text,
  primary_sport    text,
  objective        text,
  profile_completed boolean DEFAULT false,
  updated_at       timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_all" ON profiles
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
