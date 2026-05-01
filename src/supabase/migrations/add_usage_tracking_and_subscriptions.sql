-- ═══════════════════════════════════════════════════════════════════
-- add_usage_tracking_and_subscriptions.sql
-- Tables usage_logs + user_subscriptions pour le système de quotas
-- abonnements THW Coaching (Premium / Pro / Expert)
-- ═══════════════════════════════════════════════════════════════════

-- ── usage_logs ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.usage_logs (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type       text        NOT NULL
    CHECK (type IN ('message', 'plan_generation', 'tool_use', 'briefing', 'nutrition_plan', 'micro_agent')),
  metadata   jsonb       NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index principal pour les requêtes de comptage rapide par user/type/mois
CREATE INDEX IF NOT EXISTS idx_usage_logs_user_month
  ON public.usage_logs (user_id, type, created_at DESC);

ALTER TABLE public.usage_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "usage_logs_select_own" ON public.usage_logs;
CREATE POLICY "usage_logs_select_own"
  ON public.usage_logs FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "usage_logs_insert_own" ON public.usage_logs;
CREATE POLICY "usage_logs_insert_own"
  ON public.usage_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

COMMENT ON TABLE  public.usage_logs IS 'Comptage des usages IA par utilisateur pour enforcement des quotas par tier.';
COMMENT ON COLUMN public.usage_logs.type IS 'message | plan_generation | tool_use | briefing | nutrition_plan | micro_agent';
COMMENT ON COLUMN public.usage_logs.metadata IS 'Détails optionnels : model utilisé, tool_name, agent_id, etc.';

-- ── user_subscriptions ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_subscriptions (
  user_id                uuid        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tier                   text        NOT NULL DEFAULT 'premium'
    CHECK (tier IN ('premium', 'pro', 'expert')),
  stripe_customer_id     text,
  stripe_subscription_id text,
  current_period_start   timestamptz,
  current_period_end     timestamptz,
  status                 text        NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'canceled', 'past_due', 'trialing')),
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now()
);

-- Trigger updated_at
DROP TRIGGER IF EXISTS trg_user_subscriptions_updated_at ON public.user_subscriptions;
CREATE TRIGGER trg_user_subscriptions_updated_at
  BEFORE UPDATE ON public.user_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_user_subscriptions_stripe_customer
  ON public.user_subscriptions (stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;

ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "subscriptions_select_own" ON public.user_subscriptions;
CREATE POLICY "subscriptions_select_own"
  ON public.user_subscriptions FOR SELECT
  USING (auth.uid() = user_id);

COMMENT ON TABLE  public.user_subscriptions IS 'Abonnements actifs — géré par webhooks Stripe + service role.';
COMMENT ON COLUMN public.user_subscriptions.tier IS 'premium | pro | expert';
COMMENT ON COLUMN public.user_subscriptions.status IS 'active | canceled | past_due | trialing';
