-- ══════════════════════════════════════════════════════════════════════════
-- COMMUNAUTÉ — Canaux mis en sourdine par l'utilisateur. Appliqué sur thw-v2.
-- Coupe les notifications (mentions/messages) du canal et masque le non-lu.
-- Chacun ne gère que ses propres lignes.
-- ══════════════════════════════════════════════════════════════════════════
create table if not exists public.community_channel_mutes (
  user_id    uuid not null references auth.users(id) on delete cascade,
  channel_id uuid not null references public.community_channels(id) on delete cascade,
  muted_at   timestamptz not null default now(),
  primary key (user_id, channel_id)
);
alter table public.community_channel_mutes enable row level security;
create policy community_mutes_select on public.community_channel_mutes
  for select to authenticated using (user_id = (select auth.uid()));
create policy community_mutes_insert on public.community_channel_mutes
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy community_mutes_delete on public.community_channel_mutes
  for delete to authenticated using (user_id = (select auth.uid()));
