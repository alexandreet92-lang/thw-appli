-- ══════════════════════════════════════════════════════════════
-- MESSAGERIE coach ↔ athlète. Un fil par paire (coach_id, athlete_id).
-- Lecture/écriture réservées aux deux participants ; l'envoi exige un lien
-- ACCEPTÉ (coach_athlete). Chacun peut marquer comme lu.
-- + l'athlète peut lire le profil de ses coachs acceptés (nom/avatar).
--
-- Appliqué sur thw-v2 le 2026-07-29 (coach_messages + athlete_reads_coach_profile).
-- ══════════════════════════════════════════════════════════════

create table if not exists public.coach_messages (
  id         uuid primary key default gen_random_uuid(),
  coach_id   uuid not null references auth.users(id) on delete cascade,
  athlete_id uuid not null references auth.users(id) on delete cascade,
  sender_id  uuid not null references auth.users(id) on delete cascade,
  body       text not null check (length(body) between 1 and 4000),
  created_at timestamptz not null default now(),
  read_at    timestamptz
);

create index if not exists coach_messages_pair_idx on public.coach_messages(coach_id, athlete_id, created_at);
create index if not exists coach_messages_unread_idx on public.coach_messages(athlete_id, coach_id) where read_at is null;

alter table public.coach_messages enable row level security;

create policy coach_messages_select on public.coach_messages
  for select using (auth.uid() = coach_id or auth.uid() = athlete_id);

create policy coach_messages_insert on public.coach_messages
  for insert with check (
    sender_id = auth.uid()
    and (auth.uid() = coach_id or auth.uid() = athlete_id)
    and exists (
      select 1 from public.coach_athlete ca
      where ca.coach_id = coach_messages.coach_id
        and ca.athlete_id = coach_messages.athlete_id
        and ca.status = 'accepted'
    )
  );

create policy coach_messages_update on public.coach_messages
  for update using (auth.uid() = coach_id or auth.uid() = athlete_id)
  with check (auth.uid() = coach_id or auth.uid() = athlete_id);

-- Réciproque : l'athlète lit le profil de ses coachs acceptés.
drop policy if exists profiles_athlete_reads_coach on public.profiles;
create policy profiles_athlete_reads_coach on public.profiles
  for select using (exists (
    select 1 from public.coach_athlete ca
    where ca.athlete_id = auth.uid() and ca.coach_id = profiles.id and ca.status = 'accepted'
  ));
