-- ══════════════════════════════════════════════════════════════
-- TOKENS SYSTEM — comptage, jauges, wallet bonus, achats (topup)
-- ══════════════════════════════════════════════════════════════

-- Table des limites par plan
CREATE TABLE IF NOT EXISTS token_plan_limits (
  plan TEXT PRIMARY KEY,
  monthly_tokens INTEGER NOT NULL,
  rolling_6h_tokens INTEGER NOT NULL,
  per_request_tokens INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO token_plan_limits (plan, monthly_tokens, rolling_6h_tokens, per_request_tokens) VALUES
  ('trial',   50000,   15000,  8000),
  ('premium', 250000,  60000,  15000),
  ('pro',     750000,  150000, 25000),
  ('expert',  2000000, 350000, 50000)
ON CONFLICT (plan) DO NOTHING;

-- Wallet (tokens bonus achetés)
CREATE TABLE IF NOT EXISTS user_token_wallet (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  bonus_tokens INTEGER NOT NULL DEFAULT 0,
  plan_reset_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tracking des consommations
CREATE TABLE IF NOT EXISTS token_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tokens_used INTEGER NOT NULL,
  source TEXT NOT NULL,  -- 'plan' ou 'bonus'
  conversation_id UUID,
  message_id UUID,
  model TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_token_usage_user_created ON token_usage(user_id, created_at DESC);

-- Sessions d'achat (lien email -> page topup)
CREATE TABLE IF NOT EXISTS topup_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_token TEXT UNIQUE NOT NULL,
  email TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_topup_sessions_token ON topup_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_topup_sessions_expires ON topup_sessions(expires_at);

-- Historique des achats
CREATE TABLE IF NOT EXISTS token_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pack_id TEXT NOT NULL,  -- 'discovery', 'performance', 'elite'
  tokens_amount INTEGER NOT NULL,
  price_eur NUMERIC(10,2) NOT NULL,
  stripe_payment_intent_id TEXT UNIQUE,
  stripe_session_id TEXT UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending',  -- 'pending','completed','failed','refunded'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_token_purchases_user ON token_purchases(user_id, created_at DESC);

-- RLS — lecture de ses propres données uniquement (écritures = service role)
ALTER TABLE user_token_wallet ENABLE ROW LEVEL SECURITY;
ALTER TABLE token_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE token_purchases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own wallet" ON user_token_wallet;
CREATE POLICY "Users read own wallet" ON user_token_wallet FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users read own usage" ON token_usage;
CREATE POLICY "Users read own usage" ON token_usage FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users read own purchases" ON token_purchases;
CREATE POLICY "Users read own purchases" ON token_purchases FOR SELECT USING (auth.uid() = user_id);

-- Trigger : créer le wallet à l'inscription
CREATE OR REPLACE FUNCTION create_user_wallet()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_token_wallet (user_id, plan_reset_date)
  VALUES (NEW.id, NOW())
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created_wallet ON auth.users;
CREATE TRIGGER on_auth_user_created_wallet
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_user_wallet();
