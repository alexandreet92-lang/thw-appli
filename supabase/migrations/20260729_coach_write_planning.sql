-- ══════════════════════════════════════════════════════════════
-- COACH — ÉCRITURE (assignation) sur le Planning de l'athlète.
-- Le coach (lien ACCEPTÉ) peut créer/modifier/supprimer UNIQUEMENT les
-- séances qu'il a lui-même assignées (source='coach'). Il ne touche jamais
-- aux séances créées par l'athlète ou l'IA. L'athlète garde le contrôle
-- total de ses propres lignes (policy is_owner existante).
--
-- Appliqué sur thw-v2 le 2026-07-29 (coach_write_planning).
-- ══════════════════════════════════════════════════════════════

drop policy if exists planned_sessions_coach_insert on public.planned_sessions;
create policy planned_sessions_coach_insert on public.planned_sessions
  for insert with check (public.is_coach_of(user_id) and source = 'coach');

drop policy if exists planned_sessions_coach_update on public.planned_sessions;
create policy planned_sessions_coach_update on public.planned_sessions
  for update using (public.is_coach_of(user_id) and source = 'coach')
  with check (public.is_coach_of(user_id) and source = 'coach');

drop policy if exists planned_sessions_coach_delete on public.planned_sessions;
create policy planned_sessions_coach_delete on public.planned_sessions
  for delete using (public.is_coach_of(user_id) and source = 'coach');
