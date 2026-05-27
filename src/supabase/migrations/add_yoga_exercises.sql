CREATE TABLE IF NOT EXISTS yoga_exercises (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users,
  name text not null,
  category text not null,
  default_duration_seconds integer default 30,
  description text,
  is_custom boolean default false,
  created_at timestamptz default now()
);

ALTER TABLE yoga_exercises ENABLE ROW LEVEL SECURITY;

CREATE POLICY "yoga_exercises_select" ON yoga_exercises
  FOR SELECT USING (user_id IS NULL OR auth.uid() = user_id);

CREATE POLICY "yoga_exercises_insert" ON yoga_exercises
  FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "yoga_exercises_delete" ON yoga_exercises
  FOR DELETE USING (auth.uid() = user_id);
