-- ══════════════════════════════════════════════════════════════════════════
-- Demandes d'adhésion aux groupes privés. L'utilisateur demande, le créateur
-- (owner/admin) accepte ou refuse. L'ajout du membre passe par /api/community/
-- moderate (service role) → le trigger capacité/ban s'applique.
-- ══════════════════════════════════════════════════════════════════════════
create table if not exists public.community_join_requests (
  space_id   uuid not null references public.community_spaces(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  status     text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  primary key (space_id, user_id)
);
create index if not exists community_join_requests_space_idx
  on public.community_join_requests(space_id, status, created_at desc);
alter table public.community_join_requests enable row level security;

drop policy if exists community_join_req_self_insert on public.community_join_requests;
create policy community_join_req_self_insert on public.community_join_requests
  for insert to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists community_join_req_self_select on public.community_join_requests;
create policy community_join_req_self_select on public.community_join_requests
  for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists community_join_req_mod_select on public.community_join_requests;
create policy community_join_req_mod_select on public.community_join_requests
  for select to authenticated
  using (public.community_can_moderate(space_id));

drop policy if exists community_join_req_delete on public.community_join_requests;
create policy community_join_req_delete on public.community_join_requests
  for delete to authenticated
  using (user_id = (select auth.uid()) or public.community_can_moderate(space_id));
