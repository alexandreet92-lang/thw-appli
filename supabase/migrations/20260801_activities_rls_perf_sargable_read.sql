-- Performance fix — reconnexion impossible (POST /token en timeout 504).
--
-- Diagnostic : les requêtes d'auth GoTrue (/token, /user) partaient en timeout
-- (10-14 s, 504). Cause : sur la table `activities` (la plus grosse, JSONB streams),
-- le chemin SELECT cumulait DEUX policies permissives OR'ées
--   is_owner(user_id) OR is_coach_of(user_id)
-- `is_coach_of` étant une sous-requête EXISTS sur coach_athlete évaluée PAR LIGNE
-- (et en premier dans le OR). Sur les comptages exacts PostgREST + les scans triés,
-- Postgres saturait le petit compute → les requêtes d'auth (normalement ~1.5 ms)
-- attendaient derrière → timeout → reconnexion en erreur.
--
-- Correctif : exprimer « propriétaire OU coach du propriétaire » comme UN SEUL test
-- d'appartenance sargable, dont l'ensemble des athlètes coachés est calculé UNE fois
-- par requête (InitPlan / hashed SubPlan). Les lectures redeviennent index-driven,
-- sans sous-requête par ligne. Sémantique inchangée :
--   - propriétaire : accès complet
--   - coach : lecture seule sur ses athlètes acceptés
-- Vérifié : isolation intacte (un athlète ne voit que ses lignes), I/O ÷18 sur count.

drop policy if exists activities_all on public.activities;
drop policy if exists activities_coach_read on public.activities;

-- Écritures : propriétaire uniquement (par commande, aucune contribution au SELECT).
create policy activities_owner_insert on public.activities
  for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy activities_owner_update on public.activities
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy activities_owner_delete on public.activities
  for delete to authenticated
  using (user_id = (select auth.uid()));

-- Lectures : propriétaire OU coach-du-propriétaire, en une seule expression indexable.
create policy activities_read on public.activities
  for select to authenticated
  using (
    user_id in (
      select (select auth.uid())
      union all
      select ca.athlete_id
      from public.coach_athlete ca
      where ca.coach_id = (select auth.uid())
        and ca.status = 'accepted'
    )
  );
