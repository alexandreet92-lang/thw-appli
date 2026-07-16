-- ══════════════════════════════════════════════════════════════
-- Routines : automatisations planifiées. L'utilisateur décrit en langage
-- naturel ce que le coach doit faire de façon répétée (« chaque matin à 7h,
-- fais-moi le brief de ma journée »). Un planificateur horaire exécute les
-- routines dues, enregistre chaque exécution (routine_runs) et notifie.
-- ══════════════════════════════════════════════════════════════

create table if not exists public.routines (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  prompt      text not null,
  -- Planning : fréquence + heure locale (0-23) + jour de semaine éventuel.
  frequency   text not null default 'daily',   -- daily | weekdays | weekends | weekly
  hour        int  not null default 7,          -- heure de déclenchement (0-23), heure locale utilisateur
  weekday     int,                              -- 0=lundi … 6=dimanche (pour weekly)
  timezone    text not null default 'Europe/Paris',
  model       text not null default 'athena',   -- hermes | athena | zeus
  allow_write boolean not null default false,   -- garde-fou : autoriser les modifications
  enabled     boolean not null default true,    -- actif / en pause
  last_run_at timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists routines_user_idx on public.routines(user_id, created_at desc);
create index if not exists routines_enabled_idx on public.routines(enabled, hour);

create table if not exists public.routine_runs (
  id          uuid primary key default gen_random_uuid(),
  routine_id  uuid not null references public.routines(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  status      text not null default 'running',  -- running | done | error
  output      text default '',
  error       text,
  created_at  timestamptz not null default now()
);

create index if not exists routine_runs_routine_idx on public.routine_runs(routine_id, created_at desc);

alter table public.routines enable row level security;
alter table public.routine_runs enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='routines' and policyname='routines_select_own') then
    create policy "routines_select_own" on public.routines for select using (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='routines' and policyname='routines_insert_own') then
    create policy "routines_insert_own" on public.routines for insert with check (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='routines' and policyname='routines_update_own') then
    create policy "routines_update_own" on public.routines for update using (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='routines' and policyname='routines_delete_own') then
    create policy "routines_delete_own" on public.routines for delete using (auth.uid() = user_id);
  end if;

  if not exists (select 1 from pg_policies where schemaname='public' and tablename='routine_runs' and policyname='routine_runs_select_own') then
    create policy "routine_runs_select_own" on public.routine_runs for select using (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='routine_runs' and policyname='routine_runs_delete_own') then
    create policy "routine_runs_delete_own" on public.routine_runs for delete using (auth.uid() = user_id);
  end if;
end $$;
