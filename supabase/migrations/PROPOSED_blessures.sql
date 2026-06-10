-- ════════════════════════════════════════════════════════════════════
-- Schéma « Blessures » — APPLIQUÉ sur le projet thw-v2 (sfrcnyzntgrxlwlmwifi).
-- ⚠️ Contient des DROP TABLE (destructif). NE PAS ré-exécuter tel quel sur une
-- base contenant des données : les `drop` ci-dessous écraseraient injuries/injury_logs.
-- Contexte : une table `injuries` LEGACY (ancienne feature 3D : zone_id/type/date…)
-- existait et bloquait l'app (erreur 42703). Elle était vide (0 ligne) → recréée
-- proprement ci-dessous avec le bon schéma + RLS.
-- ════════════════════════════════════════════════════════════════════

drop table if exists public.injury_logs cascade;
drop table if exists public.injuries cascade;

create table public.injuries (
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
  rehab                jsonb not null default '[]'::jsonb,   -- [{ nom, detail, done }]
  impact               jsonb not null default '{"avoid":[],"ok":[]}'::jsonb,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create table public.injury_logs (
  id               uuid primary key default gen_random_uuid(),
  injury_id        uuid not null references public.injuries(id) on delete cascade,
  log_date         date not null default current_date,
  note             text,
  intensity_rest   int check (intensity_rest   between 0 and 10),
  intensity_effort int check (intensity_effort between 0 and 10),
  created_at       timestamptz not null default now()
);

create index injuries_user_idx   on public.injuries(user_id, status);
create index injury_logs_inj_idx on public.injury_logs(injury_id, log_date);

alter table public.injuries    enable row level security;
alter table public.injury_logs enable row level security;

create policy "injuries_owner" on public.injuries
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "injury_logs_owner" on public.injury_logs
  for all using (auth.uid() = (select user_id from public.injuries i where i.id = injury_id))
          with check (auth.uid() = (select user_id from public.injuries i where i.id = injury_id));

-- Recharge le cache de schéma PostgREST pour que l'API REST voie les tables.
notify pgrst, 'reload schema';
