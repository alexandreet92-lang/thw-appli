-- ══════════════════════════════════════════════════════════════
-- COACH — accès Planning complet aux tables de l'athlète (consentement requis).
-- Miroir des policies planned_sessions_coach_* : gate is_coach_of(user_id),
-- qui vérifie un lien coach_athlete ACCEPTÉ. planned_sessions & activities ont
-- déjà leurs policies coach ; on ajoute ici les tables restantes du planning.
--   • CRUD complet : week_tasks, planned_races, day_intensity, user_sections, daily_tasks
--   • Lecture seule : training_plans (le coach lit la périodisation de l'athlète)
-- ══════════════════════════════════════════════════════════════

-- ── week_tasks ────────────────────────────────────────────────
drop policy if exists week_tasks_coach_read   on public.week_tasks;
drop policy if exists week_tasks_coach_insert  on public.week_tasks;
drop policy if exists week_tasks_coach_update  on public.week_tasks;
drop policy if exists week_tasks_coach_delete  on public.week_tasks;
create policy week_tasks_coach_read   on public.week_tasks for select using (is_coach_of(user_id));
create policy week_tasks_coach_insert on public.week_tasks for insert with check (is_coach_of(user_id));
create policy week_tasks_coach_update on public.week_tasks for update using (is_coach_of(user_id)) with check (is_coach_of(user_id));
create policy week_tasks_coach_delete on public.week_tasks for delete using (is_coach_of(user_id));

-- ── planned_races ─────────────────────────────────────────────
drop policy if exists planned_races_coach_read   on public.planned_races;
drop policy if exists planned_races_coach_insert  on public.planned_races;
drop policy if exists planned_races_coach_update  on public.planned_races;
drop policy if exists planned_races_coach_delete  on public.planned_races;
create policy planned_races_coach_read   on public.planned_races for select using (is_coach_of(user_id));
create policy planned_races_coach_insert on public.planned_races for insert with check (is_coach_of(user_id));
create policy planned_races_coach_update on public.planned_races for update using (is_coach_of(user_id)) with check (is_coach_of(user_id));
create policy planned_races_coach_delete on public.planned_races for delete using (is_coach_of(user_id));

-- ── day_intensity ─────────────────────────────────────────────
drop policy if exists day_intensity_coach_read   on public.day_intensity;
drop policy if exists day_intensity_coach_insert  on public.day_intensity;
drop policy if exists day_intensity_coach_update  on public.day_intensity;
drop policy if exists day_intensity_coach_delete  on public.day_intensity;
create policy day_intensity_coach_read   on public.day_intensity for select using (is_coach_of(user_id));
create policy day_intensity_coach_insert on public.day_intensity for insert with check (is_coach_of(user_id));
create policy day_intensity_coach_update on public.day_intensity for update using (is_coach_of(user_id)) with check (is_coach_of(user_id));
create policy day_intensity_coach_delete on public.day_intensity for delete using (is_coach_of(user_id));

-- ── user_sections ─────────────────────────────────────────────
drop policy if exists user_sections_coach_read   on public.user_sections;
drop policy if exists user_sections_coach_insert  on public.user_sections;
drop policy if exists user_sections_coach_update  on public.user_sections;
drop policy if exists user_sections_coach_delete  on public.user_sections;
create policy user_sections_coach_read   on public.user_sections for select using (is_coach_of(user_id));
create policy user_sections_coach_insert on public.user_sections for insert with check (is_coach_of(user_id));
create policy user_sections_coach_update on public.user_sections for update using (is_coach_of(user_id)) with check (is_coach_of(user_id));
create policy user_sections_coach_delete on public.user_sections for delete using (is_coach_of(user_id));

-- ── daily_tasks ───────────────────────────────────────────────
drop policy if exists daily_tasks_coach_read   on public.daily_tasks;
drop policy if exists daily_tasks_coach_insert  on public.daily_tasks;
drop policy if exists daily_tasks_coach_update  on public.daily_tasks;
drop policy if exists daily_tasks_coach_delete  on public.daily_tasks;
create policy daily_tasks_coach_read   on public.daily_tasks for select using (is_coach_of(user_id));
create policy daily_tasks_coach_insert on public.daily_tasks for insert with check (is_coach_of(user_id));
create policy daily_tasks_coach_update on public.daily_tasks for update using (is_coach_of(user_id)) with check (is_coach_of(user_id));
create policy daily_tasks_coach_delete on public.daily_tasks for delete using (is_coach_of(user_id));

-- ── training_plans (lecture seule) ────────────────────────────
drop policy if exists training_plans_coach_read on public.training_plans;
create policy training_plans_coach_read on public.training_plans for select using (is_coach_of(user_id));
