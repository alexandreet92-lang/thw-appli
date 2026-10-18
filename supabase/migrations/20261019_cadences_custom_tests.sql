-- ═════════════════════════════════════════════════════════════════
-- CADENCES — tests personnalisés (privés). Chaque utilisateur crée ses propres tests
-- (épreuves, unités, repère, objectif) et enregistre des passages. Jamais publiés,
-- jamais comparés aux autres, jamais mélangés au score Decaform.
-- Idempotente. Sans effet sur les tables existantes. À coller dans le SQL Editor Supabase.
-- ═════════════════════════════════════════════════════════════════
create table if not exists public.cadences_custom_tests (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  name         text not null check (char_length(name) between 1 and 80),
  sport        text not null default '' check (char_length(sport) <= 40),
  scoring      text not null default 'per_item' check (scoring in ('values','per_item','weighted')),
  remind_months smallint check (remind_months is null or remind_months between 1 and 24),
  -- [{ id, name, measure (time|distance|weight|reps|count|percent), direction (lower|higher), ref, goal, weight }]
  items        jsonb not null default '[]'::jsonb check (jsonb_typeof(items) = 'array' and jsonb_array_length(items) between 1 and 40),
  created_at   timestamptz not null default now()
);
create index if not exists cadences_custom_tests_user_idx on public.cadences_custom_tests (user_id, created_at);

create table if not exists public.cadences_custom_runs (
  id           uuid primary key default gen_random_uuid(),
  test_id      uuid not null references public.cadences_custom_tests(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  performed_on date not null,
  values_json  jsonb not null default '{}'::jsonb check (jsonb_typeof(values_json) = 'object'),
  conditions   text not null default '' check (char_length(conditions) <= 120),
  created_at   timestamptz not null default now()
);
create index if not exists cadences_custom_runs_idx on public.cadences_custom_runs (test_id, performed_on);

alter table public.cadences_custom_tests enable row level security;
alter table public.cadences_custom_runs  enable row level security;
drop policy if exists cct_sel on public.cadences_custom_tests; drop policy if exists cct_ins on public.cadences_custom_tests;
drop policy if exists cct_del on public.cadences_custom_tests; drop policy if exists cct_upd on public.cadences_custom_tests;
drop policy if exists ccr_sel on public.cadences_custom_runs;  drop policy if exists ccr_ins on public.cadences_custom_runs;
drop policy if exists ccr_del on public.cadences_custom_runs;
create policy cct_sel on public.cadences_custom_tests for select to authenticated using (user_id = auth.uid());
create policy cct_ins on public.cadences_custom_tests for insert to authenticated with check (user_id = auth.uid());
create policy cct_upd on public.cadences_custom_tests for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy cct_del on public.cadences_custom_tests for delete to authenticated using (user_id = auth.uid());
create policy ccr_sel on public.cadences_custom_runs for select to authenticated using (user_id = auth.uid());
create policy ccr_ins on public.cadences_custom_runs for insert to authenticated with check (user_id = auth.uid() and exists (select 1 from public.cadences_custom_tests t where t.id = test_id and t.user_id = auth.uid()));
create policy ccr_del on public.cadences_custom_runs for delete to authenticated using (user_id = auth.uid());
