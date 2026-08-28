-- Tests personnalisés créés par l'athlète, visibles UNIQUEMENT par leur créateur
-- (RLS owner-only). Apparaissent dans l'onglet Tests de la page Performance à
-- côté du catalogue. Les résultats réutilisent test_results (via test_definitions).
create table if not exists public.custom_tests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  nom text not null,
  sport text not null,
  description text,
  unite text,
  results jsonb not null default '[]'::jsonb,   -- [{date, value, note}]
  created_at timestamptz not null default now()
);
alter table public.custom_tests enable row level security;
drop policy if exists "custom_tests owner all" on public.custom_tests;
create policy "custom_tests owner all" on public.custom_tests
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index if not exists custom_tests_user_sport_idx on public.custom_tests (user_id, sport);
