-- Section Habitudes : repas réguliers + nutrition à l'effort
CREATE TABLE IF NOT EXISTS nutrition_habits (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  habit_type  text        NOT NULL CHECK (habit_type IN ('regular_meal','training_fuel')),
  name        text        NOT NULL,
  ingredients jsonb,
  total_calories   integer,
  total_carbs_g    numeric(6,2),
  total_protein_g  numeric(6,2),
  created_at  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_nutrition_habits_user
  ON nutrition_habits(user_id);
CREATE INDEX IF NOT EXISTS idx_nutrition_habits_type
  ON nutrition_habits(user_id, habit_type);

ALTER TABLE nutrition_habits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "nutrition_habits_own"
  ON nutrition_habits FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
