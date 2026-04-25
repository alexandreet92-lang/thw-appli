-- ═══════════════════════════════════════════════════════════════════
-- add_original_content_to_planned_sessions.sql
-- Trace les modifications utilisateur vs la version IA originale :
-- - original_content : snapshot JSON du row à l'insert (immuable)
-- - last_user_modified_at : timestamp du dernier UPDATE manuel
--
-- Diff = current row vs original_content. Permet d'afficher visuelle-
-- ment "modifié par toi" sur les séances éditées + de revert.
-- ═══════════════════════════════════════════════════════════════════

ALTER TABLE public.planned_sessions
  ADD COLUMN IF NOT EXISTS original_content jsonb,
  ADD COLUMN IF NOT EXISTS last_user_modified_at timestamptz;

COMMENT ON COLUMN public.planned_sessions.original_content IS
  'Snapshot JSON du row tel que l''IA (ou la création initiale) l''avait posé. Immuable.';
COMMENT ON COLUMN public.planned_sessions.last_user_modified_at IS
  'Timestamp du dernier UPDATE par l''utilisateur. NULL = jamais modifié manuellement.';
