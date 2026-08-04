-- ══════════════════════════════════════════════════════════════════════════
-- COMMUNAUTÉ — Messages épinglés d'un canal (owner/admin). Appliqué sur thw-v2.
-- Table dédiée pour ne PAS élargir la policy d'update des messages (un modo ne
-- doit pas pouvoir éditer le corps d'un message d'autrui). Un message épinglé =
-- une ligne ici. Lecture par les membres ; pin/unpin par owner/admin.
-- ══════════════════════════════════════════════════════════════════════════
create table if not exists public.community_pins (
  message_id uuid primary key references public.community_messages(id) on delete cascade,
  channel_id uuid not null references public.community_channels(id) on delete cascade,
  space_id   uuid not null references public.community_spaces(id) on delete cascade,
  pinned_by  uuid not null references auth.users(id) on delete cascade,
  pinned_at  timestamptz not null default now()
);
create index if not exists community_pins_channel_idx on public.community_pins(channel_id, pinned_at desc);

alter table public.community_pins enable row level security;

create policy community_pins_select on public.community_pins
  for select to authenticated using (public.community_is_member(space_id));
create policy community_pins_insert on public.community_pins
  for insert to authenticated with check (public.community_can_moderate(space_id) and pinned_by = (select auth.uid()));
create policy community_pins_delete on public.community_pins
  for delete to authenticated using (public.community_can_moderate(space_id));

do $$
begin
  begin alter publication supabase_realtime add table public.community_pins; exception when duplicate_object then null; end;
end $$;
