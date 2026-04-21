-- ══════════════════════════════════════════════════════════════
-- NUTRITION TABLES — migration complète dans l'ordre correct
-- ══════════════════════════════════════════════════════════════

-- 1. nutrition_plans
CREATE TABLE IF NOT EXISTS nutrition_plans (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid        REFERENCES auth.users ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  type       text        CHECK (type IN ('minimal','maximal','manuel')),
  plan_data  jsonb       NOT NULL,
  actif      boolean     DEFAULT false
);
CREATE INDEX IF NOT EXISTS idx_nutrition_plans_user_id ON nutrition_plans(user_id);
ALTER TABLE nutrition_plans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "nutrition_plans_own" ON nutrition_plans;
CREATE POLICY "nutrition_plans_own" ON nutrition_plans FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 2. nutrition_daily_logs
CREATE TABLE IF NOT EXISTS nutrition_daily_logs (
  id              uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid    REFERENCES auth.users ON DELETE CASCADE,
  date            date    NOT NULL,
  kcal_consommees numeric DEFAULT 0,
  proteines       numeric DEFAULT 0,
  glucides        numeric DEFAULT 0,
  lipides         numeric DEFAULT 0,
  repas_details   jsonb,
  option_choisie  text    CHECK (option_choisie IN ('A','B','manuel')),
  UNIQUE (user_id, date)
);
CREATE INDEX IF NOT EXISTS idx_nutrition_daily_logs_user_id   ON nutrition_daily_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_nutrition_daily_logs_date      ON nutrition_daily_logs(date);
CREATE INDEX IF NOT EXISTS idx_nutrition_daily_logs_user_date ON nutrition_daily_logs(user_id, date DESC);
ALTER TABLE nutrition_daily_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "nutrition_daily_logs_own" ON nutrition_daily_logs;
CREATE POLICY "nutrition_daily_logs_own" ON nutrition_daily_logs FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 3. nutrition_meal_logs  (référence nutrition_daily_logs — doit venir après)
CREATE TABLE IF NOT EXISTS nutrition_meal_logs (
  id           uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid    REFERENCES auth.users ON DELETE CASCADE,
  daily_log_id uuid    REFERENCES nutrition_daily_logs ON DELETE CASCADE,
  date         date    NOT NULL,
  type_repas   text    CHECK (type_repas IN ('petit_dejeuner','collation_matin','dejeuner','collation_apres_midi','diner','collation_soir')),
  description  text,
  kcal         numeric,
  proteines    numeric,
  glucides     numeric,
  lipides      numeric,
  consomme     boolean DEFAULT false
);
CREATE INDEX IF NOT EXISTS idx_nutrition_meal_logs_user_id    ON nutrition_meal_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_nutrition_meal_logs_date       ON nutrition_meal_logs(date);
CREATE INDEX IF NOT EXISTS idx_nutrition_meal_logs_user_date  ON nutrition_meal_logs(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_nutrition_meal_logs_daily_log  ON nutrition_meal_logs(daily_log_id);
ALTER TABLE nutrition_meal_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "nutrition_meal_logs_own" ON nutrition_meal_logs;
CREATE POLICY "nutrition_meal_logs_own" ON nutrition_meal_logs FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 4. nutrition_meal_templates
CREATE TABLE IF NOT EXISTS nutrition_meal_templates (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        REFERENCES auth.users ON DELETE CASCADE,
  nom         text        NOT NULL,
  type_repas  text        CHECK (type_repas IN ('petit_dejeuner','collation_matin','dejeuner','collation_apres_midi','diner','collation_soir')),
  description text,
  kcal        numeric,
  proteines   numeric,
  glucides    numeric,
  lipides     numeric,
  actif       boolean     DEFAULT true,
  created_at  timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_nutrition_meal_templates_user_id   ON nutrition_meal_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_nutrition_meal_templates_user_date ON nutrition_meal_templates(user_id, created_at DESC);
ALTER TABLE nutrition_meal_templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "nutrition_meal_templates_own" ON nutrition_meal_templates;
CREATE POLICY "nutrition_meal_templates_own" ON nutrition_meal_templates FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 5. nutrition_weight_logs
CREATE TABLE IF NOT EXISTS nutrition_weight_logs (
  id      uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid    REFERENCES auth.users ON DELETE CASCADE,
  date    date    NOT NULL,
  poids   numeric,
  mg      numeric,
  mm      numeric,
  source  text    CHECK (source IN ('balance_connectee','manuel')),
  UNIQUE (user_id, date)
);
CREATE INDEX IF NOT EXISTS idx_nutrition_weight_logs_user_id   ON nutrition_weight_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_nutrition_weight_logs_date      ON nutrition_weight_logs(date);
CREATE INDEX IF NOT EXISTS idx_nutrition_weight_logs_user_date ON nutrition_weight_logs(user_id, date DESC);
ALTER TABLE nutrition_weight_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "nutrition_weight_logs_own" ON nutrition_weight_logs;
CREATE POLICY "nutrition_weight_logs_own" ON nutrition_weight_logs FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
