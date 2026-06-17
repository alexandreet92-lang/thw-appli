-- Training Blocs (cycles) — synchronisation multi-appareils.
-- Avant : stockage localStorage uniquement (un bloc créé sur desktop n'apparaissait pas sur
-- mobile). Cette table + RLS permet la sync. `trainingBlocks.ts` lit/écrit le cloud + cache local.
create table if not exists public.training_blocs (
  id text primary key,                 -- id généré côté client (uuid/slug)
  user_id uuid not null references auth.users(id) on delete cascade,
  sport text not null,
  name text not null default 'Nouveau bloc',
  start_year int,
  start_week int,                      -- numéro de semaine ISO
  duration_weeks int default 4,
  focus jsonb default '[]'::jsonb,
  sessions jsonb default '[]'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.training_blocs enable row level security;

drop policy if exists "training_blocs_select" on public.training_blocs;
drop policy if exists "training_blocs_insert" on public.training_blocs;
drop policy if exists "training_blocs_update" on public.training_blocs;
drop policy if exists "training_blocs_delete" on public.training_blocs;
create policy "training_blocs_select" on public.training_blocs for select using (auth.uid() = user_id);
create policy "training_blocs_insert" on public.training_blocs for insert with check (auth.uid() = user_id);
create policy "training_blocs_update" on public.training_blocs for update using (auth.uid() = user_id);
create policy "training_blocs_delete" on public.training_blocs for delete using (auth.uid() = user_id);
