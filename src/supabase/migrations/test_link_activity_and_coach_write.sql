-- ══════════════════════════════════════════════════════════════
-- Tests de performance : lier une activité au résultat + accès COACH.
--
-- 1) test_results.activity_id → une activité peut être rattachée au résultat
--    (ON DELETE SET NULL : supprimer l'activité ne détruit pas le résultat).
-- 2) Le coach peut LIRE et ÉCRIRE les résultats de test de ses athlètes
--    (même prédicat is_coach_of(user_id) que le reste de l'interface coach),
--    sur test_results, performance_tests et performance_scores.
-- Idempotent.
-- ══════════════════════════════════════════════════════════════

-- ── 1. Lien activité ──────────────────────────────────────────
alter table test_results
  add column if not exists activity_id uuid references activities(id) on delete set null;

-- ── 2. test_results : coach read + insert ─────────────────────
drop policy if exists test_results_coach_read on test_results;
create policy test_results_coach_read
  on test_results for select
  using (is_coach_of(user_id));

drop policy if exists test_results_coach_insert on test_results;
create policy test_results_coach_insert
  on test_results for insert
  with check (is_coach_of(user_id));

-- ── 3. performance_tests : coach read + insert ────────────────
drop policy if exists performance_tests_coach_read on performance_tests;
create policy performance_tests_coach_read
  on performance_tests for select
  using (is_coach_of(user_id));

drop policy if exists performance_tests_coach_insert on performance_tests;
create policy performance_tests_coach_insert
  on performance_tests for insert
  with check (is_coach_of(user_id));

-- ── 4. performance_scores : coach read + insert + update ──────
drop policy if exists performance_scores_coach_read on performance_scores;
create policy performance_scores_coach_read
  on performance_scores for select
  using (is_coach_of(user_id));

drop policy if exists performance_scores_coach_insert on performance_scores;
create policy performance_scores_coach_insert
  on performance_scores for insert
  with check (is_coach_of(user_id));

drop policy if exists performance_scores_coach_update on performance_scores;
create policy performance_scores_coach_update
  on performance_scores for update
  using (is_coach_of(user_id)) with check (is_coach_of(user_id));
