-- ═══════════════════════════════════════════════════════════════════
-- add_briefing.sql
-- Table daily_briefing — Briefing Matinal généré par l'IA pour l'athlète.
-- Une entrée par jour (cf. commentaire sur UNIQUE ci-dessous).
-- ═══════════════════════════════════════════════════════════════════

-- ── Table ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.daily_briefing (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL    DEFAULT now(),
  date       date        NOT NULL    UNIQUE,
  content    jsonb       NOT NULL,
  lu         boolean     NOT NULL    DEFAULT false,
  user_id    uuid        REFERENCES auth.users(id) ON DELETE CASCADE
);

-- ⚠️  ALTERNATIVE RECOMMANDÉE pour une app multi-user :
-- Remplacer la contrainte UNIQUE(date) ci-dessus par une contrainte
-- composite UNIQUE(user_id, date) afin d'autoriser un briefing par
-- utilisateur par jour. Exemple :
--
--   ALTER TABLE public.daily_briefing DROP CONSTRAINT daily_briefing_date_key;
--   ALTER TABLE public.daily_briefing
--     ADD CONSTRAINT daily_briefing_user_date_key UNIQUE (user_id, date);

-- ── Index ──────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_daily_briefing_date
  ON public.daily_briefing (date);

CREATE INDEX IF NOT EXISTS idx_daily_briefing_user_id
  ON public.daily_briefing (user_id);

-- ── RLS ────────────────────────────────────────────────────────────
ALTER TABLE public.daily_briefing ENABLE ROW LEVEL SECURITY;

-- SELECT : un user voit uniquement ses briefings
DROP POLICY IF EXISTS "daily_briefing_select_own" ON public.daily_briefing;
CREATE POLICY "daily_briefing_select_own"
  ON public.daily_briefing
  FOR SELECT
  USING (auth.uid() = user_id);

-- INSERT : un user ne peut créer que pour lui-même
DROP POLICY IF EXISTS "daily_briefing_insert_own" ON public.daily_briefing;
CREATE POLICY "daily_briefing_insert_own"
  ON public.daily_briefing
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- UPDATE : un user ne peut modifier que les siens (ex. passer lu=true)
DROP POLICY IF EXISTS "daily_briefing_update_own" ON public.daily_briefing;
CREATE POLICY "daily_briefing_update_own"
  ON public.daily_briefing
  FOR UPDATE
  USING    (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- DELETE : un user ne peut supprimer que les siens
DROP POLICY IF EXISTS "daily_briefing_delete_own" ON public.daily_briefing;
CREATE POLICY "daily_briefing_delete_own"
  ON public.daily_briefing
  FOR DELETE
  USING (auth.uid() = user_id);

-- ── Commentaires métadonnées ───────────────────────────────────────
COMMENT ON TABLE  public.daily_briefing IS
  'Briefing matinal généré par l''IA pour chaque utilisateur.';
COMMENT ON COLUMN public.daily_briefing.content IS
  'JSONB structuré : résumé, insights, recommandations, citations sources.';
COMMENT ON COLUMN public.daily_briefing.lu IS
  'true une fois que l''utilisateur a marqué le briefing comme lu.';
