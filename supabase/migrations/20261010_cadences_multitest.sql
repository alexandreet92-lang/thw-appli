-- ══════════════════════════════════════════════════════════════════
-- DECAFORM — base multi-tests (plateforme). NON appliquée sans OK d'Alex.
--
-- Objectif : permettre plusieurs batteries (Decaform + Kids/Teens/Start/Senior)
-- qui coexistent. Chaque batterie = un `test_key` avec SA version de barème
-- active. Decaform reste `test_key='decaform'` (comportement inchangé).
--
-- Corrige aussi des bornes codées en dur qui excluent les nouveaux publics :
--   • age_at_start 18–80  → 6–100  (enfants 8 ans … seniors)
--   • body_weight_kg 30–250 → 12–250 (un enfant pèse < 30 kg)
--   • results.day_index 1–12 → 1–31 (batteries à nombre de séances variable)
-- N'impacte AUCUNE donnée existante (les lignes Decaform restent valides).
-- ══════════════════════════════════════════════════════════════════

-- ── 1. Colonne test_key ─────────────────────────────────────────────
alter table public.cadences_scale_versions
  add column if not exists test_key text not null default 'decaform';
alter table public.cadences_campaigns
  add column if not exists test_key text not null default 'decaform';

-- Le label de barème n'est unique QUE dans un test_key (ex. 'v1.0' peut exister
-- pour decaform et pour kids_8_10). On remplace l'unicité globale du label.
alter table public.cadences_scale_versions
  drop constraint if exists cadences_scale_versions_label_key;
create unique index if not exists cadences_scale_versions_key_label
  on public.cadences_scale_versions (test_key, label);

-- ── 2. « Un seul barème actif » → un seul PAR test_key ──────────────
drop index if exists public.cadences_one_active_scale;
create unique index if not exists cadences_one_active_scale_per_key
  on public.cadences_scale_versions (test_key) where is_active;

-- Index de sélection du barème actif d'une batterie.
create index if not exists cadences_scale_versions_key_active
  on public.cadences_scale_versions (test_key, is_active);
create index if not exists cadences_campaigns_test_key_idx
  on public.cadences_campaigns (user_id, test_key, started_on desc);

-- ── 3. Bornes âge / poids / jours élargies pour les nouveaux publics ─
alter table public.cadences_campaigns
  drop constraint if exists cadences_campaigns_age_at_start_check;
alter table public.cadences_campaigns
  add constraint cadences_campaigns_age_at_start_check
  check (age_at_start between 6 and 100);

alter table public.cadences_campaigns
  drop constraint if exists cadences_campaigns_body_weight_kg_check;
alter table public.cadences_campaigns
  add constraint cadences_campaigns_body_weight_kg_check
  check (body_weight_kg between 12 and 250);

alter table public.cadences_results
  drop constraint if exists cadences_results_day_index_check;
alter table public.cadences_results
  add constraint cadences_results_day_index_check
  check (day_index between 1 and 31);

-- ── 4. Note ──────────────────────────────────────────────────────────
-- Le SEED des barèmes des nouvelles batteries (une version active par test_key :
-- kids_8_10, kids_11_12, teens_13_14, teens_15_17, start, senior) et la bascule
-- de Decaform en v1.2 (épreuve mixte) sont insérés par une migration de données
-- séparée, une fois les configs encodées et validées. Ici : schéma uniquement.
