-- ══════════════════════════════════════════════════════════════════════════
-- MODÉRATION MESSAGERIE PRIVÉE — Blocage utilisateur + signalement de contenu.
-- Exigence Apple App Store (Guideline 1.2 : contenu généré par l'utilisateur) :
--   1. Signaler un contenu / un utilisateur (report).
--   2. Bloquer un utilisateur abusif (plus aucun message échangé).
-- 100 % ADDITIF : nouvelles tables uniquement, aucune modification destructive.
-- Couvre : messagerie coach ↔ athlète (coach_messages) et groupes
-- (message_group_messages).
-- ══════════════════════════════════════════════════════════════════════════

-- ── 1. Blocages utilisateur ↔ utilisateur ───────────────────────────────────
create table if not exists public.user_blocks (
  blocker_id uuid not null references auth.users(id) on delete cascade,
  blocked_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  constraint user_blocks_not_self check (blocker_id <> blocked_id)
);
create index if not exists user_blocks_blocked_idx on public.user_blocks(blocked_id);
alter table public.user_blocks enable row level security;

-- Chacun gère UNIQUEMENT ses propres blocages (voir / créer / retirer).
drop policy if exists user_blocks_select on public.user_blocks;
create policy user_blocks_select on public.user_blocks
  for select to authenticated
  using (blocker_id = (select auth.uid()));
drop policy if exists user_blocks_insert on public.user_blocks;
create policy user_blocks_insert on public.user_blocks
  for insert to authenticated
  with check (blocker_id = (select auth.uid()));
drop policy if exists user_blocks_delete on public.user_blocks;
create policy user_blocks_delete on public.user_blocks
  for delete to authenticated
  using (blocker_id = (select auth.uid()));

-- Y a-t-il un blocage dans un sens OU dans l'autre entre deux utilisateurs ?
-- SECURITY DEFINER : lisible depuis un trigger/policy sans exposer la table.
create or replace function public.users_block_exists(a uuid, b uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_blocks
    where (blocker_id = a and blocked_id = b)
       or (blocker_id = b and blocked_id = a)
  );
$$;
revoke all on function public.users_block_exists(uuid, uuid) from public, anon;
grant execute on function public.users_block_exists(uuid, uuid) to authenticated;

-- ── 2. Signalements de contenu / d'utilisateur (messagerie privée) ───────────
create table if not exists public.dm_reports (
  id               uuid primary key default gen_random_uuid(),
  reporter_id      uuid not null references auth.users(id) on delete cascade,
  reported_user_id uuid references auth.users(id) on delete set null,
  context          text not null check (context in ('coach_dm', 'group', 'profile')),
  message_id       uuid,        -- coach_messages.id OU message_group_messages.id (non contraint : deux sources)
  message_excerpt  text check (length(message_excerpt) <= 1000),
  reason           text not null check (length(reason) between 1 and 400),
  status           text not null default 'open' check (status in ('open', 'resolved', 'dismissed')),
  created_at       timestamptz not null default now()
);
create index if not exists dm_reports_status_idx on public.dm_reports(status, created_at desc);
create index if not exists dm_reports_reporter_idx on public.dm_reports(reporter_id, created_at desc);
alter table public.dm_reports enable row level security;

-- Un utilisateur crée et relit UNIQUEMENT ses propres signalements.
-- Le traitement (revue/résolution) se fait via le service role (hors RLS).
drop policy if exists dm_reports_insert on public.dm_reports;
create policy dm_reports_insert on public.dm_reports
  for insert to authenticated
  with check (reporter_id = (select auth.uid()));
drop policy if exists dm_reports_select on public.dm_reports;
create policy dm_reports_select on public.dm_reports
  for select to authenticated
  using (reporter_id = (select auth.uid()));

-- ── 3. Garde-fou : un message coach↔athlète est refusé si un blocage existe ──
-- S'applique à l'insertion : l'expéditeur ne peut plus écrire au participant
-- qu'il a bloqué (ou qui l'a bloqué). Les deux participants du fil sont
-- coach_id et athlete_id.
create or replace function public.coach_messages_block_guard()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  if public.users_block_exists(new.coach_id, new.athlete_id) then
    raise exception 'Conversation indisponible : un blocage est actif entre ces utilisateurs.'
      using errcode = '42501';
  end if;
  return new;
end $$;
revoke all on function public.coach_messages_block_guard() from public, anon, authenticated;

drop trigger if exists coach_messages_block_guard_trg on public.coach_messages;
create trigger coach_messages_block_guard_trg
  before insert on public.coach_messages
  for each row execute function public.coach_messages_block_guard();
