-- ══════════════════════════════════════════════════════════════════════════
-- Partage de position en direct : un athlète partage sa position pendant sa
-- sortie ; les proches choisis (personnes qu'il suit) la suivent en temps réel.
-- ══════════════════════════════════════════════════════════════════════════

create table if not exists public.live_shares (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references auth.users(id) on delete cascade,
  sport       text,
  active      boolean not null default true,
  lat         double precision,
  lng         double precision,
  elapsed_s   integer default 0,
  distance_m  double precision default 0,
  started_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  ended_at    timestamptz
);
create index if not exists live_shares_owner_idx on public.live_shares(owner_id);
create index if not exists live_shares_active_idx on public.live_shares(active);

create table if not exists public.live_share_recipients (
  share_id uuid not null references public.live_shares(id) on delete cascade,
  user_id  uuid not null references auth.users(id) on delete cascade,
  primary key (share_id, user_id)
);
create index if not exists live_share_recipients_user_idx on public.live_share_recipients(user_id);

alter table public.live_shares enable row level security;
alter table public.live_share_recipients enable row level security;

-- Propriétaire : accès complet à ses partages.
drop policy if exists live_shares_owner on public.live_shares;
create policy live_shares_owner on public.live_shares
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- Destinataire : lecture des partages dont il fait partie.
drop policy if exists live_shares_recipient_read on public.live_shares;
create policy live_shares_recipient_read on public.live_shares
  for select using (
    exists (select 1 from public.live_share_recipients r
            where r.share_id = live_shares.id and r.user_id = auth.uid())
  );

-- Destinataires : le propriétaire du partage gère la liste ; chacun voit sa ligne.
drop policy if exists lsr_owner on public.live_share_recipients;
create policy lsr_owner on public.live_share_recipients
  for all using (
    exists (select 1 from public.live_shares s
            where s.id = live_share_recipients.share_id and s.owner_id = auth.uid())
  ) with check (
    exists (select 1 from public.live_shares s
            where s.id = live_share_recipients.share_id and s.owner_id = auth.uid())
  );
drop policy if exists lsr_self_read on public.live_share_recipients;
create policy lsr_self_read on public.live_share_recipients
  for select using (user_id = auth.uid());

-- Temps réel pour la vue du proche.
alter publication supabase_realtime add table public.live_shares;
