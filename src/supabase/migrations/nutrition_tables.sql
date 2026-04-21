-- nutrition_plans
CREATE TABLE IF NOT EXISTS nutrition_plans (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at  timestamptz DEFAULT now(),
  type        text NOT NULL CHECK (type IN ('minimal','maximal','manuel')),
  plan_data   jsonb NOT NULL DEFAULT '{}',
  actif       boolean DEFAULT false
);
CREATE INDEX IF NOT EXISTS nutrition_plans_user ON nutrition_plans(user_id, created_at DESC);
ALTER TABLE nutrition_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own nutrition_plans" ON nutrition_plans FOR ALL USING (auth.uid() = user_id);

-- nutrition_daily_logs
CREATE TABLE IF NOT EXISTS nutrition_daily_logs (
  id                uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id           uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date              date NOT NULL,
  kcal_consommees   numeric DEFAULT 0,
  proteines         numeric DEFAULT 0,
  glucides          numeric DEFAULT 0,
  lipides           numeric DEFAULT 0,
  repas_details     jsonb DEFAULT '{}',
  option_choisie    text CHECK (option_choisie IN ('A','B','manuel')) DEFAULT 'A',
  UNIQUE(user_id, date)
);
CREATE INDEX IF NOT EXISTS nutrition_daily_logs_user ON nutrition_daily_logs(user_id, date DESC);
ALTER TABLE nutrition_daily_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own nutrition_daily_logs" ON nutrition_daily_logs FOR ALL USING (auth.uid() = user_id);

-- nutrition_weight_logs
CREATE TABLE IF NOT EXISTS nutrition_weight_logs (
  id      uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date    date NOT NULL,
  poids   numeric,
  mg      numeric,
  mm      numeric,
  source  text CHECK (source IN ('balance_connectee','manuel')) DEFAULT 'manuel',
  UNIQUE(user_id, date)
);
CREATE INDEX IF NOT EXISTS nutrition_weight_logs_user ON nutrition_weight_logs(user_id, date DESC);
ALTER TABLE nutrition_weight_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own nutrition_weight_logs" ON nutrition_weight_logs FOR ALL USING (auth.uid() = user_id);
