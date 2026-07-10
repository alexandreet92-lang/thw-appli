-- ══════════════════════════════════════════════════════════════
-- Phase 1 — Génération en arrière-plan : chaque réponse du coach
-- central est enregistrée côté serveur (coach_runs), indépendamment
-- de l'onglet. Permet de retrouver une réponse terminée pendant que
-- l'app était fermée. RLS stricte (chaque athlète ne voit que ses runs).
-- ══════════════════════════════════════════════════════════════

create table if not exists public.coach_runs (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  conv_id    text,
  status     text not null default 'running',   -- running | done | error
  content    text default '',
  model      text,
  error      text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists coach_runs_user_conv_idx
  on public.coach_runs(user_id, conv_id, created_at desc);

alter table public.coach_runs enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='coach_runs' and policyname='coach_runs_select_own') then
    create policy "coach_runs_select_own" on public.coach_runs for select using (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='coach_runs' and policyname='coach_runs_insert_own') then
    create policy "coach_runs_insert_own" on public.coach_runs for insert with check (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='coach_runs' and policyname='coach_runs_update_own') then
    create policy "coach_runs_update_own" on public.coach_runs for update using (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='coach_runs' and policyname='coach_runs_delete_own') then
    create policy "coach_runs_delete_own" on public.coach_runs for delete using (auth.uid() = user_id);
  end if;
end $$;
