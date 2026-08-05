-- ══════════════════════════════════════════════════════════════
-- Écriture COACH sur les données de performance de ses athlètes.
--
-- Le coach pouvait déjà LIRE (policies *_coach_read = is_coach_of(user_id)).
-- Pour éditer la page Performance d'un athlète depuis l'interface coach, on
-- ajoute des policies d'ÉCRITURE gardées par le MÊME prédicat is_coach_of(user_id)
-- (relation coach↔athlète 'accepted'). L'athlète garde évidemment ses droits.
--
-- Tables : athlete_performance_profile, training_zones, athlete_sport_profile,
-- profiles (poids). Idempotent (drop policy if exists puis create).
-- ══════════════════════════════════════════════════════════════

-- ── athlete_performance_profile : le coach peut insérer / mettre à jour ──
drop policy if exists athlete_performance_profile_coach_write on athlete_performance_profile;
create policy athlete_performance_profile_coach_write
  on athlete_performance_profile for update
  using (is_coach_of(user_id)) with check (is_coach_of(user_id));

drop policy if exists athlete_performance_profile_coach_insert on athlete_performance_profile;
create policy athlete_performance_profile_coach_insert
  on athlete_performance_profile for insert
  with check (is_coach_of(user_id));

-- ── training_zones : le coach peut insérer / mettre à jour ──
drop policy if exists training_zones_coach_write on training_zones;
create policy training_zones_coach_write
  on training_zones for update
  using (is_coach_of(user_id)) with check (is_coach_of(user_id));

drop policy if exists training_zones_coach_insert on training_zones;
create policy training_zones_coach_insert
  on training_zones for insert
  with check (is_coach_of(user_id));

-- ── athlete_sport_profile : le coach peut lire + écrire ──
drop policy if exists athlete_sport_profile_coach_read on athlete_sport_profile;
create policy athlete_sport_profile_coach_read
  on athlete_sport_profile for select
  using (is_coach_of(user_id));

drop policy if exists athlete_sport_profile_coach_write on athlete_sport_profile;
create policy athlete_sport_profile_coach_write
  on athlete_sport_profile for update
  using (is_coach_of(user_id)) with check (is_coach_of(user_id));

drop policy if exists athlete_sport_profile_coach_insert on athlete_sport_profile;
create policy athlete_sport_profile_coach_insert
  on athlete_sport_profile for insert
  with check (is_coach_of(user_id));

-- ── profiles : le coach peut mettre à jour (poids depuis la page Performance) ──
drop policy if exists profiles_coach_update on profiles;
create policy profiles_coach_update
  on profiles for update
  using (is_coach_of(id)) with check (is_coach_of(id));
