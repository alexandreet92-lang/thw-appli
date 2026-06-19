-- ══════════════════════════════════════════════════════════════
-- TOKENS — recalibrage des limites par plan (juin 2026)
--
-- Contexte : la boucle agentique streamée (coach « cerveau ») appelle le
-- modèle plusieurs fois par message et renvoie le contexte à chaque tour.
-- Couplé au multiplicateur Zeus, l'ancien plafond 6h (350k Expert) se vidait
-- en ~3 messages. Le prompt caching divise désormais la conso réelle par ~3-4 ;
-- on relève en parallèle les plafonds pour garantir ~70 % de marge en usage
-- normal dès Pro, et a fortiori Expert.
--
-- Ces lignes existent déjà (seed initial avec ON CONFLICT DO NOTHING) : on les
-- met donc à jour explicitement.
-- ══════════════════════════════════════════════════════════════

UPDATE token_plan_limits SET
  monthly_tokens     = 120000,
  rolling_6h_tokens  = 40000,
  per_request_tokens = 12000
WHERE plan = 'trial';

UPDATE token_plan_limits SET
  monthly_tokens     = 700000,
  rolling_6h_tokens  = 200000,
  per_request_tokens = 25000
WHERE plan = 'premium';

UPDATE token_plan_limits SET
  monthly_tokens     = 3000000,
  rolling_6h_tokens  = 800000,
  per_request_tokens = 60000
WHERE plan = 'pro';

UPDATE token_plan_limits SET
  monthly_tokens     = 8000000,
  rolling_6h_tokens  = 2000000,
  per_request_tokens = 150000
WHERE plan = 'expert';

-- Filet de sécurité : si un plan n'existait pas encore, on le crée.
INSERT INTO token_plan_limits (plan, monthly_tokens, rolling_6h_tokens, per_request_tokens) VALUES
  ('trial',    120000,  40000,   12000),
  ('premium',  700000,  200000,  25000),
  ('pro',      3000000, 800000,  60000),
  ('expert',   8000000, 2000000, 150000)
ON CONFLICT (plan) DO UPDATE SET
  monthly_tokens     = EXCLUDED.monthly_tokens,
  rolling_6h_tokens  = EXCLUDED.rolling_6h_tokens,
  per_request_tokens = EXCLUDED.per_request_tokens;
