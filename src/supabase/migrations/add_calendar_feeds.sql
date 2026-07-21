-- Jeton privé par utilisateur pour l'abonnement calendrier (flux ICS).
-- L'URL du flux contient ce jeton (impossible à deviner). L'endpoint ICS lit
-- via le service role (bypass RLS) ; le client ne touche que sa propre ligne.
create table if not exists public.calendar_feeds (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  token      text unique not null default replace(gen_random_uuid()::text, '-', ''),
  created_at timestamptz not null default now()
);
alter table public.calendar_feeds enable row level security;

drop policy if exists calendar_feeds_own_select on public.calendar_feeds;
create policy calendar_feeds_own_select on public.calendar_feeds
  for select using (auth.uid() = user_id);

drop policy if exists calendar_feeds_own_insert on public.calendar_feeds;
create policy calendar_feeds_own_insert on public.calendar_feeds
  for insert with check (auth.uid() = user_id);

drop policy if exists calendar_feeds_own_delete on public.calendar_feeds;
create policy calendar_feeds_own_delete on public.calendar_feeds
  for delete using (auth.uid() = user_id);
