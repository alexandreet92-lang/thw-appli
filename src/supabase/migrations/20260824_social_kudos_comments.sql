-- ══════════════════════════════════════════════════════════════════
-- Couche sociale du Fil (façon Strava) : kudos + commentaires sur les activités.
-- Tables additives — le code déjà déployé les ignore. RLS : lecture pour les
-- authentifiés, écriture/suppression de ses propres lignes (commentaire aussi
-- supprimable par le propriétaire de l'activité).
-- ══════════════════════════════════════════════════════════════════

create table if not exists public.activity_kudos (
  activity_id uuid not null references public.activities(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (activity_id, user_id)
);
create index if not exists activity_kudos_activity_idx on public.activity_kudos(activity_id);

alter table public.activity_kudos enable row level security;
drop policy if exists "kudos select auth" on public.activity_kudos;
create policy "kudos select auth" on public.activity_kudos for select to authenticated using (true);
drop policy if exists "kudos insert own" on public.activity_kudos;
create policy "kudos insert own" on public.activity_kudos for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "kudos delete own" on public.activity_kudos;
create policy "kudos delete own" on public.activity_kudos for delete to authenticated using (auth.uid() = user_id);

create table if not exists public.activity_comments (
  id          uuid primary key default gen_random_uuid(),
  activity_id uuid not null references public.activities(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  body        text not null check (char_length(body) between 1 and 2000),
  created_at  timestamptz not null default now()
);
create index if not exists activity_comments_activity_idx on public.activity_comments(activity_id, created_at);

alter table public.activity_comments enable row level security;
drop policy if exists "comments select auth" on public.activity_comments;
create policy "comments select auth" on public.activity_comments for select to authenticated using (true);
drop policy if exists "comments insert own" on public.activity_comments;
create policy "comments insert own" on public.activity_comments for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "comments delete own or owner" on public.activity_comments;
create policy "comments delete own or owner" on public.activity_comments for delete to authenticated
  using (auth.uid() = user_id or auth.uid() = (select a.user_id from public.activities a where a.id = activity_id));
