-- ══════════════════════════════════════════════════════════════════════════
-- COMMUNAUTÉ — Logo (image) d'un espace, façon Discord. Appliqué sur thw-v2.
-- Affiché en pastille ronde dans le rail et les listes ; repli sur un monogramme
-- sobre si absent. Écriture réservée owner/admin (policy community_spaces_update) ;
-- les espaces officiels sont mis à jour via service role.
-- ══════════════════════════════════════════════════════════════════════════
alter table public.community_spaces add column if not exists icon_url text;
