-- COACH — accès au calendrier de l'athlète (consentement requis, is_coach_of).
-- race_events / planned_races ont déjà leurs policies coach ; on ajoute les
-- événements & types de calendrier personnalisés (CRUD).
do $$
declare tbl text;
begin
  foreach tbl in array array['calendar_events','calendar_event_types'] loop
    execute format('drop policy if exists %I_coach_read on public.%I', tbl, tbl);
    execute format('drop policy if exists %I_coach_insert on public.%I', tbl, tbl);
    execute format('drop policy if exists %I_coach_update on public.%I', tbl, tbl);
    execute format('drop policy if exists %I_coach_delete on public.%I', tbl, tbl);
    execute format('create policy %I_coach_read on public.%I for select using (is_coach_of(user_id))', tbl, tbl);
    execute format('create policy %I_coach_insert on public.%I for insert with check (is_coach_of(user_id))', tbl, tbl);
    execute format('create policy %I_coach_update on public.%I for update using (is_coach_of(user_id)) with check (is_coach_of(user_id))', tbl, tbl);
    execute format('create policy %I_coach_delete on public.%I for delete using (is_coach_of(user_id))', tbl, tbl);
  end loop;
end $$;
