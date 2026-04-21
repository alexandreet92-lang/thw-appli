-- nutrition_meal_logs
CREATE TABLE nutrition_meal_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users ON DELETE CASCADE,
  daily_log_id uuid REFERENCES nutrition_daily_logs ON DELETE CASCADE,
  date date NOT NULL,
  type_repas text CHECK (type_repas IN ('petit_dejeuner','collation_matin','dejeuner','collation_apres_midi','diner','collation_soir')),
  description text,
  kcal numeric, proteines numeric, glucides numeric, lipides numeric,
  consomme boolean DEFAULT false
);
CREATE INDEX idx_nutrition_meal_logs_user_id ON nutrition_meal_logs(user_id);
CREATE INDEX idx_nutrition_meal_logs_date ON nutrition_meal_logs(date);
CREATE INDEX idx_nutrition_meal_logs_user_date ON nutrition_meal_logs(user_id, date DESC);
ALTER TABLE nutrition_meal_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "nutrition_meal_logs_own" ON nutrition_meal_logs FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- nutrition_meal_templates
CREATE TABLE nutrition_meal_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users ON DELETE CASCADE,
  nom text NOT NULL,
  type_repas text CHECK (type_repas IN ('petit_dejeuner','collation_matin','dejeuner','collation_apres_midi','diner','collation_soir')),
  description text,
  kcal numeric, proteines numeric, glucides numeric, lipides numeric,
  actif boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX idx_nutrition_meal_templates_user_id ON nutrition_meal_templates(user_id);
CREATE INDEX idx_nutrition_meal_templates_user_date ON nutrition_meal_templates(user_id, created_at DESC);
ALTER TABLE nutrition_meal_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "nutrition_meal_templates_own" ON nutrition_meal_templates FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
