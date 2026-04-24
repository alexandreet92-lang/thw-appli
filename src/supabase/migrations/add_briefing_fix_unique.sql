-- ═══════════════════════════════════════════════════════════════════
-- add_briefing_fix_unique.sql
-- Corrige la contrainte UNIQUE de daily_briefing : passe de UNIQUE(date)
-- à UNIQUE(user_id, date) pour autoriser un briefing par user par jour
-- (table en RLS multi-user).
--
-- Idempotent : DROP IF EXISTS + ADD avec nom explicite.
-- ═══════════════════════════════════════════════════════════════════

-- 1. Retirer l'ancienne contrainte globale UNIQUE(date)
--    Le nom auto-généré par Postgres suit le pattern <table>_<col>_key.
ALTER TABLE public.daily_briefing
  DROP CONSTRAINT IF EXISTS daily_briefing_date_key;

-- 2. Ajouter la contrainte composite UNIQUE(user_id, date)
--    On vérifie d'abord qu'elle n'existe pas déjà (idempotence).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'daily_briefing_user_date_key'
      AND conrelid = 'public.daily_briefing'::regclass
  ) THEN
    ALTER TABLE public.daily_briefing
      ADD CONSTRAINT daily_briefing_user_date_key UNIQUE (user_id, date);
  END IF;
END $$;

-- 3. Index composite utile pour les lookups fréquents (user, date)
--    déjà couvert implicitement par la contrainte UNIQUE ci-dessus
--    (Postgres crée un index b-tree pour chaque unique constraint),
--    mais on garde l'index simple sur date pour les queries cross-user
--    côté admin. L'index simple sur user_id reste utile aussi.
