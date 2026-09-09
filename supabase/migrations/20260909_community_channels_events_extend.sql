-- ══════════════════════════════════════════════════════════════════════════
-- COMMUNAUTÉ — thèmes de salon, épinglage de salon (par utilisateur), et
-- extension des événements (salon concerné, date de fin, fréquence, thème).
-- Additif et rétro-compatible. Appliqué sur thw-v2.
-- ══════════════════════════════════════════════════════════════════════════

-- 1) Thèmes d'un salon (nutrition / entraînement / récupération / custom…).
alter table public.community_channels
  add column if not exists themes text[] not null default '{}';

-- 2) Épinglage d'un salon EN HAUT, propre à chaque utilisateur (comme le mute).
create table if not exists public.community_channel_pins (
  user_id    uuid not null references auth.users(id) on delete cascade,
  channel_id uuid not null references public.community_channels(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, channel_id)
);
alter table public.community_channel_pins enable row level security;

drop policy if exists community_channel_pins_all on public.community_channel_pins;
create policy community_channel_pins_all on public.community_channel_pins
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- 3) Événements enrichis : salon concerné, fin, fréquence, thème.
alter table public.community_events
  add column if not exists channel_id uuid references public.community_channels(id) on delete set null,
  add column if not exists ends_at   timestamptz,
  add column if not exists frequency text not null default 'once'
    check (frequency in ('once','daily','weekly','biweekly','monthly','yearly','weekdays','weekend')),
  add column if not exists theme     text;
