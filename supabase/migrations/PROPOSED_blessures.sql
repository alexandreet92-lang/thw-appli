-- ════════════════════════════════════════════════════════════════════
-- PROPOSITION DE SCHÉMA — page « Blessures » (NON APPLIQUÉE)
-- Relue par l'humain puis exécutée manuellement. Ne pas lancer automatiquement.
-- ════════════════════════════════════════════════════════════════════

create table if not exists public.injuries (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid not null references auth.users(id) on delete cascade,
  severity             text not null check (severity in ('gene','douleur','blessure')),
  zone                 text not null,
  side                 text check (side in ('gauche','droit','central')),
  structure            text check (structure in ('muscle','tendon','articulation','ligament','os','nerf','inconnu')),
  precision            text,
  intensity_rest       int  check (intensity_rest   between 0 and 10),
  intensity_effort     int  check (intensity_effort between 0 and 10),
  onset_date           date not null,
  mechanism            text check (mechanism in ('soudaine','progressive')),
  activity             text,
  evolution            text check (evolution in ('aggrave','stable','ameliore')),
  description          text,
  phase                text not null default 'aigue'
                         check (phase in ('aigue','recuperation','reathletisation','resolu')),
  return_estimate_date date,
  status               text not null default 'active' check (status in ('active','resolved')),
  resolved_date        date,
  practitioner         text,
  next_appointment     date,
  rehab                jsonb not null default '[]'::jsonb,  -- [{ nom, detail, done }]
  impact               jsonb not null default '{"avoid":[],"ok":[]}'::jsonb,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create table if not exists public.injury_logs (
  id               uuid primary key default gen_random_uuid(),
  injury_id        uuid not null references public.injuries(id) on delete cascade,
  log_date         date not null default current_date,
  note             text,
  intensity_rest   int check (intensity_rest   between 0 and 10),
  intensity_effort int check (intensity_effort between 0 and 10),
  created_at       timestamptz not null default now()
);

create index if not exists injuries_user_idx     on public.injuries(user_id, status);
create index if not exists injury_logs_inj_idx   on public.injury_logs(injury_id, log_date);

-- RLS
alter table public.injuries    enable row level security;
alter table public.injury_logs enable row level security;

create policy "injuries_owner" on public.injuries
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "injury_logs_owner" on public.injury_logs
  for all using (
    auth.uid() = (select user_id from public.injuries i where i.id = injury_id)
  ) with check (
    auth.uid() = (select user_id from public.injuries i where i.id = injury_id)
  );
