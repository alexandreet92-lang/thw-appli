-- ══════════════════════════════════════════════════════════════
-- COACH — ÉCRITURE Planning : autoriser le coach (lien ACCEPTÉ) à
-- créer/modifier/supprimer TOUTES les séances de son athlète, quelle
-- que soit leur origine (source), à l'image des autres tables du
-- planning (week_tasks, planned_races, day_intensity, user_sections,
-- daily_tasks) qui n'imposent que is_coach_of(user_id).
--
-- Contexte : les policies coach de planned_sessions exigeaient jusqu'ici
-- `source = 'coach'`. Résultat : le coach ne pouvait pas modifier les
-- séances de l'athlète dont source = NULL (créées par l'athlète ou
-- héritées d'avant le tracking `source`) — l'UPDATE était rejeté par la
-- RLS et la modif silencieusement annulée côté client (« ça ne
-- s'enregistre pas »).
--
-- Cette migration remplace les 3 policies coach (insert/update/delete)
-- pour ne conserver que la garde is_coach_of(user_id).
--
-- Appliqué sur thw-v2 le 2026-08-09 (coach_write_planning_any_source).
-- ══════════════════════════════════════════════════════════════

drop policy if exists planned_sessions_coach_insert on public.planned_sessions;
create policy planned_sessions_coach_insert on public.planned_sessions
  for insert with check (public.is_coach_of(user_id));

drop policy if exists planned_sessions_coach_update on public.planned_sessions;
create policy planned_sessions_coach_update on public.planned_sessions
  for update using (public.is_coach_of(user_id))
  with check (public.is_coach_of(user_id));

drop policy if exists planned_sessions_coach_delete on public.planned_sessions;
create policy planned_sessions_coach_delete on public.planned_sessions
  for delete using (public.is_coach_of(user_id));
