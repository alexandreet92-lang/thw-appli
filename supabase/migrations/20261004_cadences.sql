-- ══════════════════════════════════════════════════════════════════
-- CADENCES — tables + RLS (spéc §14). Appliquée à la prod (thw-v2) le 2026-10-04.
-- On stocke les RÉSULTATS BRUTS : le score se recalcule avec n'importe quelle
-- version de barème. Le seed de la version v1.0 (config JSON) est inséré à part.
-- N'impacte AUCUNE donnée existante.
-- ══════════════════════════════════════════════════════════════════

-- Versions du barème (la config §6 y est copiée telle quelle).
create table if not exists public.cadences_scale_versions (
  id         uuid primary key default gen_random_uuid(),
  label      text not null unique,          -- ex. 'v1.0'
  config     jsonb not null,
  is_active  boolean not null default false,
  created_at timestamptz not null default now()
);
create unique index if not exists cadences_one_active_scale
  on public.cadences_scale_versions (is_active) where is_active;

-- Une campagne = un passage complet (annuel).
create table if not exists public.cadences_campaigns (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  scale_version_id uuid not null references public.cadences_scale_versions(id),
  scale_sex        text not null check (scale_sex in ('M','F')),
  age_at_start     int not null check (age_at_start between 18 and 80),
  age_band         text not null,
  body_weight_kg   numeric(5,2) not null check (body_weight_kg between 30 and 250),
  status           text not null default 'in_progress' check (status in ('in_progress','completed','abandoned')),
  started_on       date not null default current_date,
  completed_on     date,
  next_retest_on   date,
  share_for_calibration boolean not null default false,
  created_at       timestamptz not null default now()
);
create index if not exists cadences_campaigns_user_idx
  on public.cadences_campaigns (user_id, started_on desc);

-- Un résultat par épreuve et par campagne.
create table if not exists public.cadences_results (
  id            uuid primary key default gen_random_uuid(),
  campaign_id   uuid not null references public.cadences_campaigns(id) on delete cascade,
  test_slug     text not null,
  day_index     int not null check (day_index between 1 and 12),
  tested_on     date not null,
  raw_value     numeric,                 -- s, m, kg, W, tours (null = non passée)
  raw_parts     jsonb,                   -- 6 temps du 6.200, 3 passages Move, 5 tours Hyrox, splits 3200, tours+reps AMRAP
  variant       text check (variant in ('box','plate')),
  equipment     text check (equipment in ('normales','pointes','sans','ceinture')),
  timing_method text check (timing_method in ('manuel','cellules','montre')),
  pool_length_m int check (pool_length_m in (25,50)),
  status        text not null default 'validated' check (status in ('draft','validated','skipped')),
  skip_reason   text,
  notes         text,
  updated_at    timestamptz not null default now(),
  unique (campaign_id, test_slug)
);

-- Instantané des scores à la clôture (et à chaque recalcul avec une autre version).
create table if not exists public.cadences_snapshots (
  campaign_id      uuid not null references public.cadences_campaigns(id) on delete cascade,
  scale_version_id uuid not null references public.cadences_scale_versions(id),
  age_mode         text not null check (age_mode in ('general','age')),
  total_points     numeric not null,
  quality_scores   jsonb not null,
  test_scores      jsonb not null,
  computed_at      timestamptz not null default now(),
  primary key (campaign_id, scale_version_id, age_mode)
);

-- ── RLS ─────────────────────────────────────────────────────────────
alter table public.cadences_scale_versions enable row level security;
alter table public.cadences_campaigns      enable row level security;
alter table public.cadences_results        enable row level security;
alter table public.cadences_snapshots      enable row level security;

-- Barème : lecture pour tout utilisateur connecté ; écriture via service role (routes admin) uniquement.
drop policy if exists cadences_scale_read on public.cadences_scale_versions;
create policy cadences_scale_read on public.cadences_scale_versions
  for select to authenticated using (true);

-- Campagnes : chacun les siennes.
drop policy if exists cadences_campaigns_sel on public.cadences_campaigns;
drop policy if exists cadences_campaigns_ins on public.cadences_campaigns;
drop policy if exists cadences_campaigns_upd on public.cadences_campaigns;
drop policy if exists cadences_campaigns_del on public.cadences_campaigns;
create policy cadences_campaigns_sel on public.cadences_campaigns for select to authenticated using (user_id = auth.uid());
create policy cadences_campaigns_ins on public.cadences_campaigns for insert to authenticated with check (user_id = auth.uid());
create policy cadences_campaigns_upd on public.cadences_campaigns for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy cadences_campaigns_del on public.cadences_campaigns for delete to authenticated using (user_id = auth.uid());

-- Résultats : via la campagne possédée.
drop policy if exists cadences_results_sel on public.cadences_results;
drop policy if exists cadences_results_ins on public.cadences_results;
drop policy if exists cadences_results_upd on public.cadences_results;
drop policy if exists cadences_results_del on public.cadences_results;
create policy cadences_results_sel on public.cadences_results for select to authenticated using (exists (select 1 from public.cadences_campaigns c where c.id = campaign_id and c.user_id = auth.uid()));
create policy cadences_results_ins on public.cadences_results for insert to authenticated with check (exists (select 1 from public.cadences_campaigns c where c.id = campaign_id and c.user_id = auth.uid()));
create policy cadences_results_upd on public.cadences_results for update to authenticated using (exists (select 1 from public.cadences_campaigns c where c.id = campaign_id and c.user_id = auth.uid())) with check (exists (select 1 from public.cadences_campaigns c where c.id = campaign_id and c.user_id = auth.uid()));
create policy cadences_results_del on public.cadences_results for delete to authenticated using (exists (select 1 from public.cadences_campaigns c where c.id = campaign_id and c.user_id = auth.uid()));

-- Snapshots : lecture via la campagne ; écriture via service role (clôture) uniquement.
drop policy if exists cadences_snapshots_sel on public.cadences_snapshots;
create policy cadences_snapshots_sel on public.cadences_snapshots for select to authenticated using (exists (select 1 from public.cadences_campaigns c where c.id = campaign_id and c.user_id = auth.uid()));
