-- ══════════════════════════════════════════════════════════════════════════
-- Élargit les sports possibles d'un espace communautaire :
-- + triathlon, trail, combat (sports de combat).
-- ══════════════════════════════════════════════════════════════════════════
alter table public.community_spaces drop constraint if exists community_spaces_sport_check;
alter table public.community_spaces add constraint community_spaces_sport_check
  check (sport is null or sport in ('running', 'cycling', 'hyrox', 'gym', 'triathlon', 'trail', 'combat'));
