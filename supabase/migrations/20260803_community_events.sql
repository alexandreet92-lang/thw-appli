-- ══════════════════════════════════════════════════════════════════════════
-- COMMUNAUTÉ — Événements / défis (sorties de groupe, WOD, courses…) + RSVP.
-- Appliqué sur thw-v2. RLS : lecture/écriture réservées aux membres de l'espace ;
-- édition/suppression par le créateur ou owner/admin ; chacun gère son propre RSVP.
-- ══════════════════════════════════════════════════════════════════════════
create table if not exists public.community_events (
  id          uuid primary key default gen_random_uuid(),
  space_id    uuid not null references public.community_spaces(id) on delete cascade,
  created_by  uuid not null references auth.users(id) on delete cascade,
  title       text not null check (length(title) between 1 and 120),
  description text check (length(description) <= 2000),
  kind        text not null default 'sortie' check (kind in ('sortie','wod','defi','course','autre')),
  location    text check (length(location) <= 200),
  starts_at   timestamptz not null,
  created_at  timestamptz not null default now()
);
create index if not exists community_events_space_idx on public.community_events(space_id, starts_at);

create table if not exists public.community_event_rsvps (
  event_id   uuid not null references public.community_events(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  status     text not null default 'going' check (status in ('going','maybe','no')),
  created_at timestamptz not null default now(),
  primary key (event_id, user_id)
);

create or replace function public.community_event_space(p_event uuid)
returns uuid language sql stable security definer set search_path = public as $$
  select space_id from public.community_events where id = p_event;
$$;
revoke all on function public.community_event_space(uuid) from public, anon;
grant execute on function public.community_event_space(uuid) to authenticated;

alter table public.community_events enable row level security;
alter table public.community_event_rsvps enable row level security;

create policy community_events_select on public.community_events
  for select to authenticated using (public.community_is_member(space_id));
create policy community_events_insert on public.community_events
  for insert to authenticated with check (created_by = (select auth.uid()) and public.community_is_member(space_id));
create policy community_events_update on public.community_events
  for update to authenticated
  using (created_by = (select auth.uid()) or public.community_can_moderate(space_id))
  with check (created_by = (select auth.uid()) or public.community_can_moderate(space_id));
create policy community_events_delete on public.community_events
  for delete to authenticated
  using (created_by = (select auth.uid()) or public.community_can_moderate(space_id));

create policy community_rsvps_select on public.community_event_rsvps
  for select to authenticated using (public.community_is_member(public.community_event_space(event_id)));
create policy community_rsvps_insert on public.community_event_rsvps
  for insert to authenticated
  with check (user_id = (select auth.uid()) and public.community_is_member(public.community_event_space(event_id)));
create policy community_rsvps_update on public.community_event_rsvps
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy community_rsvps_delete on public.community_event_rsvps
  for delete to authenticated using (user_id = (select auth.uid()));

do $$
begin
  begin alter publication supabase_realtime add table public.community_events; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.community_event_rsvps; exception when duplicate_object then null; end;
end $$;
