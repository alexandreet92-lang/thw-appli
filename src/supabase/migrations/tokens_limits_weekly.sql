-- ══════════════════════════════════════════════════════════════
-- TOKENS — passage à une fenêtre HEBDOMADAIRE unique (sept. 2026)
--
-- Contexte : la colonne s'appelait `monthly_tokens` mais la fenêtre réellement
-- appliquée dépendait de l'utilisateur —
--   · abonné « athlète » (current_period_start posé par Stripe) → ~1 mois
--   · coach (pack), essai, compte gratuit (champ absent)        → 7 jours
-- Deux utilisateurs du même tier n'avaient donc pas la même limite, et un coach
-- consommait ~4,3× le budget prévu.
--
-- Décision : une seule règle, la fenêtre glissante de 7 jours pour tout le monde
-- (modèle Claude / ChatGPT : une fenêtre courte 6 h + une fenêtre longue 7 j).
-- Les plafonds sont divisés par ~4 pour retomber sur le budget mensuel réel.
--
-- Coût cible (≈ 1 $ / M tokens pondérés en entrée, 5 $ / M en sortie) :
--   premium  175k/sem ≈ 0,75 M/mois ≈  1,1 $  sur 14 €  →  7 % du MRR
--   pro      700k/sem ≈ 3,0  M/mois ≈  4,5 $  sur 26 €  → 16 %
--   expert   2 M/sem  ≈ 8,6  M/mois ≈ 13   $  sur 49 €  → 24 %
-- (seuil d'alerte marge = 30 %, voir src/lib/admin/metrics.ts)
-- ══════════════════════════════════════════════════════════════

-- 1. La colonne dit enfin ce qu'elle fait.
ALTER TABLE token_plan_limits RENAME COLUMN monthly_tokens TO weekly_tokens;

-- 2. Recalibrage des plafonds sur la fenêtre de 7 jours.
UPDATE token_plan_limits SET
  weekly_tokens      = 120000,
  rolling_6h_tokens  = 40000,
  per_request_tokens = 12000
WHERE plan = 'trial';

UPDATE token_plan_limits SET
  weekly_tokens      = 175000,
  rolling_6h_tokens  = 80000,
  per_request_tokens = 25000
WHERE plan = 'premium';

UPDATE token_plan_limits SET
  weekly_tokens      = 700000,
  rolling_6h_tokens  = 300000,
  per_request_tokens = 60000
WHERE plan = 'pro';

UPDATE token_plan_limits SET
  weekly_tokens      = 2000000,
  rolling_6h_tokens  = 800000,
  per_request_tokens = 150000
WHERE plan = 'expert';

-- Filet de sécurité : si un plan n'existait pas encore, on le crée.
INSERT INTO token_plan_limits (plan, weekly_tokens, rolling_6h_tokens, per_request_tokens) VALUES
  ('trial',    120000,  40000,  12000),
  ('premium',  175000,  80000,  25000),
  ('pro',      700000,  300000, 60000),
  ('expert',   2000000, 800000, 150000)
ON CONFLICT (plan) DO UPDATE SET
  weekly_tokens      = EXCLUDED.weekly_tokens,
  rolling_6h_tokens  = EXCLUDED.rolling_6h_tokens,
  per_request_tokens = EXCLUDED.per_request_tokens;

-- 3. Index de lecture des compteurs : chaque appel IA lit maintenant la conso
--    de la fenêtre (7 j et 6 h). Sans index, ces deux SELECT scannent la table.
CREATE INDEX IF NOT EXISTS idx_token_usage_user_created
  ON token_usage (user_id, created_at DESC);
