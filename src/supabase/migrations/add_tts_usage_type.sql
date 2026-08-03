-- ═══════════════════════════════════════════════════════════════════
-- add_tts_usage_type.sql
-- Autorise le type 'tts' dans usage_logs pour compter la consommation
-- de synthèse vocale (quota mensuel anti-abus — voir src/lib/tts/guard.ts).
-- Le nb de caractères de chaque appel est stocké dans metadata->>'chars'.
-- ═══════════════════════════════════════════════════════════════════

ALTER TABLE public.usage_logs
  DROP CONSTRAINT IF EXISTS usage_logs_type_check;

ALTER TABLE public.usage_logs
  ADD CONSTRAINT usage_logs_type_check
  CHECK (type IN (
    'message',
    'plan_generation',
    'tool_use',
    'briefing',
    'nutrition_plan',
    'micro_agent',
    'tts'
  ));

COMMENT ON COLUMN public.usage_logs.type IS
  'message | plan_generation | tool_use | briefing | nutrition_plan | micro_agent | tts';

-- L'index existant idx_usage_logs_user_month (user_id, type, created_at DESC)
-- couvre déjà la somme mensuelle des caractères TTS.
