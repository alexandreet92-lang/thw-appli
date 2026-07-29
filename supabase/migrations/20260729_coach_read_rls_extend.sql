-- ══════════════════════════════════════════════════════════════
-- COACH — Extension de l'accès LECTURE (SELECT) aux données de l'athlète,
-- tables restantes. Même modèle que profiles/activities : un coach ACCEPTÉ
-- (is_coach_of) peut lire les lignes de ses athlètes. Aucune écriture.
--
-- Appliqué sur thw-v2 le 2026-07-29 (migration coach_read_rls_extend).
-- ══════════════════════════════════════════════════════════════

do $$
declare
  tbl text;
  tables text[] := array[
    'recovery_checkin','injuries','nutrition_plans','nutrition_daily_logs',
    'nutrition_meal_logs','planned_sessions','body_measurements','health_data','race_events'
  ];
begin
  foreach tbl in array tables loop
    execute format('drop policy if exists %I on public.%I', tbl || '_coach_read', tbl);
    execute format(
      'create policy %I on public.%I for select using (public.is_coach_of(user_id))',
      tbl || '_coach_read', tbl
    );
  end loop;
end $$;
