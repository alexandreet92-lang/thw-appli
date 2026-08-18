-- ══════════════════════════════════════════════════════════════
-- COACH — accès CRUD complet aux Training Blocs de l'athlète (consentement requis).
-- Miroir des policies coach_planning_rls : gate is_coach_of(user_id), qui vérifie
-- un lien coach_athlete ACCEPTÉ.
--
-- BUG corrigé : « + nouveau bloc » restait sans effet côté coach. Les seules
-- policies existantes exigeaient auth.uid() = user_id, donc un coach ne pouvait
-- ni lire ni insérer un bloc avec user_id = athleteId → push cloud rejeté par la
-- RLS, sync cloud vide. Ces policies coach débloquent la création/édition.
-- ══════════════════════════════════════════════════════════════

drop policy if exists training_blocs_coach_read   on public.training_blocs;
drop policy if exists training_blocs_coach_insert on public.training_blocs;
drop policy if exists training_blocs_coach_update on public.training_blocs;
drop policy if exists training_blocs_coach_delete on public.training_blocs;
create policy training_blocs_coach_read   on public.training_blocs for select using (is_coach_of(user_id));
create policy training_blocs_coach_insert on public.training_blocs for insert with check (is_coach_of(user_id));
create policy training_blocs_coach_update on public.training_blocs for update using (is_coach_of(user_id)) with check (is_coach_of(user_id));
create policy training_blocs_coach_delete on public.training_blocs for delete using (is_coach_of(user_id));
