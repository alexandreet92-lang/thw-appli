-- ══════════════════════════════════════════════════════════════════════════
-- Canaux PRIVÉS : ajoute community_channels.is_private.
-- Un canal privé n'est visible/lisible QUE par les membres de l'espace (les
-- visiteurs d'un espace public ne le voient pas). Additif et rétro-compatible :
-- tous les canaux existants restent publics (is_private = false).
-- ══════════════════════════════════════════════════════════════════════════

alter table public.community_channels
  add column if not exists is_private boolean not null default false;

-- Lecture : un canal public suit la règle de l'espace (public ou membre) ;
-- un canal privé exige d'être membre de l'espace.
drop policy if exists community_channels_select on public.community_channels;
create policy community_channels_select on public.community_channels
  for select to authenticated
  using (
    case
      when is_private then public.community_is_member(space_id)
      else public.community_space_is_public(space_id) or public.community_is_member(space_id)
    end
  );
