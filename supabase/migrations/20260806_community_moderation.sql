-- ══════════════════════════════════════════════════════════════════════════
-- COMMUNAUTÉ — Sécurité & modération (inspiré Discord). 100 % ADDITIF :
-- les valeurs par défaut préservent le comportement actuel (open, 0, {}, null).
--
-- Contenu :
--   1. Réglages d'espace (créateur) : capacité, slow mode, politique d'accès,
--      ancienneté minimale de compte, acceptation des règles, mots bloqués.
--   2. Bans (bannissement d'un membre d'un espace).
--   3. Signalements (reports) de messages/membres.
--   4. Journal d'audit de modération.
--   5. Acceptation des règles par membre.
--   6. Garde-fous serveur : trigger capacité + ban à l'insertion de membre ;
--      RLS d'auto-inscription durcie (pas de ban, politique 'open', âge de compte).
-- ══════════════════════════════════════════════════════════════════════════

-- ── 1. Réglages d'espace ────────────────────────────────────────────────────
alter table public.community_spaces
  add column if not exists max_members          integer,
  add column if not exists slow_mode_sec        integer not null default 0
    check (slow_mode_sec between 0 and 21600),
  add column if not exists join_policy          text not null default 'open'
    check (join_policy in ('open', 'closed')),
  add column if not exists min_account_age_days integer not null default 0
    check (min_account_age_days between 0 and 3650),
  add column if not exists require_rules_accept boolean not null default false,
  add column if not exists rules_text           text check (length(rules_text) <= 4000),
  add column if not exists blocked_words        text[] not null default '{}';

-- Capacité positive uniquement (null = illimité).
do $$ begin
  alter table public.community_spaces add constraint community_spaces_max_members_chk
    check (max_members is null or max_members between 1 and 1000000);
exception when duplicate_object then null; end $$;

-- ── 2. Bans ─────────────────────────────────────────────────────────────────
create table if not exists public.community_bans (
  space_id  uuid not null references public.community_spaces(id) on delete cascade,
  user_id   uuid not null references auth.users(id) on delete cascade,
  banned_by uuid references auth.users(id) on delete set null,
  reason    text check (length(reason) <= 400),
  created_at timestamptz not null default now(),
  primary key (space_id, user_id)
);
alter table public.community_bans enable row level security;
-- Lecture réservée à la modération ; écriture via service role (route /moderate).
drop policy if exists community_bans_select on public.community_bans;
create policy community_bans_select on public.community_bans
  for select to authenticated
  using (public.community_can_moderate(space_id));

-- ── 3. Signalements ─────────────────────────────────────────────────────────
create table if not exists public.community_reports (
  id          uuid primary key default gen_random_uuid(),
  space_id    uuid not null references public.community_spaces(id) on delete cascade,
  channel_id  uuid references public.community_channels(id) on delete set null,
  message_id  uuid references public.community_messages(id) on delete set null,
  reported_by uuid not null references auth.users(id) on delete cascade,
  reason      text not null check (length(reason) between 1 and 400),
  status      text not null default 'open' check (status in ('open', 'resolved', 'dismissed')),
  created_at  timestamptz not null default now()
);
create index if not exists community_reports_space_idx
  on public.community_reports(space_id, status, created_at desc);
alter table public.community_reports enable row level security;
-- Un membre signale ; la modération lit et traite.
drop policy if exists community_reports_insert on public.community_reports;
create policy community_reports_insert on public.community_reports
  for insert to authenticated
  with check (reported_by = (select auth.uid()) and public.community_is_member(space_id));
drop policy if exists community_reports_select on public.community_reports;
create policy community_reports_select on public.community_reports
  for select to authenticated
  using (public.community_can_moderate(space_id));
drop policy if exists community_reports_update on public.community_reports;
create policy community_reports_update on public.community_reports
  for update to authenticated
  using (public.community_can_moderate(space_id))
  with check (public.community_can_moderate(space_id));

-- ── 4. Journal d'audit ──────────────────────────────────────────────────────
create table if not exists public.community_audit_log (
  id          uuid primary key default gen_random_uuid(),
  space_id    uuid not null references public.community_spaces(id) on delete cascade,
  actor_id    uuid references auth.users(id) on delete set null,
  action      text not null,
  target_type text,
  target_id   text,
  meta        jsonb,
  created_at  timestamptz not null default now()
);
create index if not exists community_audit_space_idx
  on public.community_audit_log(space_id, created_at desc);
alter table public.community_audit_log enable row level security;
-- Lecture modération ; écriture via service role uniquement (aucune policy insert).
drop policy if exists community_audit_select on public.community_audit_log;
create policy community_audit_select on public.community_audit_log
  for select to authenticated
  using (public.community_can_moderate(space_id));

-- ── 5. Acceptation des règles ───────────────────────────────────────────────
create table if not exists public.community_rules_accepted (
  space_id    uuid not null references public.community_spaces(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  accepted_at timestamptz not null default now(),
  primary key (space_id, user_id)
);
alter table public.community_rules_accepted enable row level security;
drop policy if exists community_rules_self_select on public.community_rules_accepted;
create policy community_rules_self_select on public.community_rules_accepted
  for select to authenticated
  using (user_id = (select auth.uid()));
drop policy if exists community_rules_self_insert on public.community_rules_accepted;
create policy community_rules_self_insert on public.community_rules_accepted
  for insert to authenticated
  with check (user_id = (select auth.uid()));

-- ── 6. Helpers + garde-fous ─────────────────────────────────────────────────

-- L'auto-inscription est-elle autorisée pour l'utilisateur courant ?
-- (pas banni, politique 'open', compte assez ancien). SECURITY DEFINER pour
-- lire community_bans / auth.users depuis une policy sans exposer ces tables.
create or replace function public.community_join_allowed(p_space uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select
    not exists (
      select 1 from public.community_bans b
      where b.space_id = p_space and b.user_id = (select auth.uid())
    )
    and coalesce((select join_policy from public.community_spaces where id = p_space), 'open') = 'open'
    and (
      coalesce((select min_account_age_days from public.community_spaces where id = p_space), 0) = 0
      or coalesce((select created_at from auth.users where id = (select auth.uid())), now())
         <= now() - make_interval(days => coalesce((select min_account_age_days from public.community_spaces where id = p_space), 0))
    );
$$;
revoke all on function public.community_join_allowed(uuid) from public, anon;
grant execute on function public.community_join_allowed(uuid) to authenticated;

-- Trigger universel (s'applique aussi au service role) : bloque l'ajout d'un
-- membre banni et le dépassement de capacité.
create or replace function public.community_members_guard()
returns trigger
language plpgsql security definer
set search_path = public
as $$
declare mx integer; cnt integer;
begin
  if exists (
    select 1 from public.community_bans b
    where b.space_id = new.space_id and b.user_id = new.user_id
  ) then
    raise exception 'Cet utilisateur est banni de cet espace.' using errcode = '42501';
  end if;

  select max_members into mx from public.community_spaces where id = new.space_id;
  if mx is not null then
    select count(*) into cnt from public.community_members where space_id = new.space_id;
    if cnt >= mx then
      raise exception 'Cet espace a atteint sa capacité maximale.' using errcode = '42501';
    end if;
  end if;

  return new;
end $$;

-- Fonction de trigger : pas d'appel direct (RPC) — le trigger l'invoque en interne.
revoke all on function public.community_members_guard() from public, anon, authenticated;

drop trigger if exists community_members_guard_trg on public.community_members;
create trigger community_members_guard_trg
  before insert on public.community_members
  for each row execute function public.community_members_guard();

-- Durcit l'auto-inscription (RLS) : ajoute les contrôles ban/politique/âge.
-- Le service role (routes de modération) n'est pas soumis à la RLS et peut donc
-- toujours ajouter un membre invité dans un espace 'closed'.
drop policy if exists community_members_insert on public.community_members;
create policy community_members_insert on public.community_members
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and role = 'member'
    and public.community_space_is_public(space_id)
    and public.community_join_allowed(space_id)
  );
