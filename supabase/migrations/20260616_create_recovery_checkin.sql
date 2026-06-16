-- Migration : table de check-in subjectif quotidien (Récupération)
-- Appliquée sur le projet thw-v2 le 2026-06-16 via Supabase MCP (apply_migration).
-- Modèle 4 échelles 1-5 ; readiness/fatigue dérivés sont stockés à part dans
-- health_data (data_type='readiness', colonnes readiness_score / fatigue_level).

create table if not exists public.recovery_checkin (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  date          date not null,
  sleep_quality int  not null check (sleep_quality between 1 and 5),
  fatigue       int  not null check (fatigue between 1 and 5),
  soreness      int  not null check (soreness between 1 and 5),
  mood          int  not null check (mood between 1 and 5),
  created_at    timestamptz not null default now(),
  unique (user_id, date)
);

alter table public.recovery_checkin enable row level security;

create policy "recovery_checkin_all"
  on public.recovery_checkin
  for all
  using (is_owner(user_id))
  with check (is_owner(user_id));
