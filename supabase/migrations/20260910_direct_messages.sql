-- ══════════════════════════════════════════════════════════════════════════
-- MESSAGES DIRECTS 1-1 : réutilise l'infra des groupes (un DM = un groupe à 2).
-- Colonne is_dm pour distinguer un DM d'un vrai groupe. RPC get_or_create_dm :
-- retourne le fil 1-1 existant entre l'utilisateur courant et p_other, ou le
-- crée (security definer → dédoublonnage atomique, contourne la RLS uniquement
-- pour l'amorçage). Appliqué sur thw-v2.
-- ══════════════════════════════════════════════════════════════════════════
alter table public.message_groups
  add column if not exists is_dm boolean not null default false;

create or replace function public.get_or_create_dm(p_other uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  gid uuid;
begin
  if me is null or p_other is null or p_other = me then
    return null;
  end if;
  if not exists (select 1 from public.profiles where id = p_other) then
    return null;
  end if;
  -- Fil existant : un groupe is_dm dont les membres sont EXACTEMENT {me, other}.
  select g.id into gid
  from public.message_groups g
  where g.is_dm
    and exists (select 1 from public.message_group_members m where m.group_id = g.id and m.user_id = me)
    and exists (select 1 from public.message_group_members m where m.group_id = g.id and m.user_id = p_other)
    and (select count(*) from public.message_group_members m where m.group_id = g.id) = 2
  limit 1;
  if gid is not null then
    return gid;
  end if;
  -- Création du fil.
  insert into public.message_groups (name, created_by, admin_managed, is_dm)
  values ('', me, false, true) returning id into gid;
  insert into public.message_group_members (group_id, user_id, role)
  values (gid, me, 'member'), (gid, p_other, 'member');
  return gid;
end;
$$;
revoke all on function public.get_or_create_dm(uuid) from public, anon;
grant execute on function public.get_or_create_dm(uuid) to authenticated;
