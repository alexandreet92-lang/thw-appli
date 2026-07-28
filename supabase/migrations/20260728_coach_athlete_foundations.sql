-- ══════════════════════════════════════════════════════════════
-- COACH — Fondations (Phase 1) : relation coach ↔ athlète avec
-- CONSENTEMENT explicite de l'athlète, + accès coach en LECTURE
-- (modèle : profil + activités). Les autres tables (récup, nutrition,
-- blessures, planning) suivront le même modèle en phase 2.
--
-- Appliqué sur le projet thw-v2 le 2026-07-28 via migrations :
--   coach_athlete_foundations + coach_athlete_harden_grants
-- ══════════════════════════════════════════════════════════════

create table if not exists public.coach_athlete (
  id          uuid primary key default gen_random_uuid(),
  coach_id    uuid not null references auth.users(id) on delete cascade,
  athlete_id  uuid references auth.users(id) on delete cascade,
  code        text unique,                    -- code d'invitation (tant que pending)
  status      text not null default 'pending' check (status in ('pending','accepted','revoked')),
  created_at  timestamptz not null default now(),
  accepted_at timestamptz,
  revoked_at  timestamptz,
  constraint coach_athlete_not_self check (athlete_id is null or athlete_id <> coach_id),
  constraint coach_athlete_unique unique (coach_id, athlete_id)
);

create index if not exists coach_athlete_coach_idx   on public.coach_athlete(coach_id);
create index if not exists coach_athlete_athlete_idx on public.coach_athlete(athlete_id, status);
create index if not exists coach_athlete_code_idx    on public.coach_athlete(code) where code is not null;

alter table public.coach_athlete enable row level security;

create policy coach_athlete_select on public.coach_athlete
  for select using (coach_id = auth.uid() or athlete_id = auth.uid());

create policy coach_athlete_insert on public.coach_athlete
  for insert with check (coach_id = auth.uid() or athlete_id = auth.uid());

create policy coach_athlete_update on public.coach_athlete
  for update using (coach_id = auth.uid() or athlete_id = auth.uid())
  with check (coach_id = auth.uid() or athlete_id = auth.uid());

create policy coach_athlete_delete on public.coach_athlete
  for delete using (coach_id = auth.uid() or athlete_id = auth.uid());

-- Vrai si l'utilisateur courant est un coach ACCEPTÉ de row_user_id.
create or replace function public.is_coach_of(row_user_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.coach_athlete ca
    where ca.coach_id = auth.uid()
      and ca.athlete_id = row_user_id
      and ca.status = 'accepted'
  );
$$;

-- Acceptation par code : l'athlète CONSENT à être coaché.
create or replace function public.accept_coach_invite(invite_code text)
returns public.coach_athlete
language plpgsql security definer set search_path = public
as $$
declare
  inv public.coach_athlete;
begin
  if auth.uid() is null then
    raise exception 'Authentification requise';
  end if;
  select * into inv from public.coach_athlete
   where code = invite_code and status = 'pending' and athlete_id is null
   for update;
  if not found then
    raise exception 'Invitation invalide ou déjà utilisée';
  end if;
  if inv.coach_id = auth.uid() then
    raise exception 'Tu ne peux pas être ton propre coach';
  end if;
  update public.coach_athlete
     set athlete_id = auth.uid(), status = 'accepted', accepted_at = now(), code = null
   where id = inv.id
   returning * into inv;
  return inv;
end;
$$;

revoke execute on function public.accept_coach_invite(text) from anon, public;
revoke execute on function public.is_coach_of(uuid)          from anon, public;
grant  execute on function public.accept_coach_invite(text) to authenticated;
grant  execute on function public.is_coach_of(uuid)          to authenticated;

-- ── Accès coach en LECTURE (modèle : profil + activités) ──────────────
create policy profiles_coach_select on public.profiles
  for select using (public.is_coach_of(id));

create policy activities_coach_read on public.activities
  for select using (public.is_coach_of(user_id));
