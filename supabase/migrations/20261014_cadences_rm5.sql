-- ═════════════════════════════════════════════════════════════════
-- DECAFORM v1.2 — phase 16-17 : références squat / soulevé de terre abaissées,
-- choix 3RM / 5RM, 8e qualité « Endurance musculaire ». (SCHÉMA + DONNÉES)
-- NON appliquée sans OK d'Alex.
--
-- 1) Élargit le CHECK de cadences_results.variant à 'rm5' (5RM saisi à la place du 3RM).
-- 2) Met à jour la ligne ACTIVE decaform v1.2 par petites requêtes (une grosse
--    requête expire sur l'outil d'administration) :
--      · références (Réf) abaissées, MAX inchangés :
--          hommes   squat 1,35 → 1.25   · soulevé de terre 1,8 → 1.6
--          femmes   squat 0,90 → 0.83  · soulevé de terre 1,2 → 1.07
--      · rm_choice = true sur les 6 épreuves en 3RM, facteur global rm5_to_3rm = 1.06 ;
--      · 8e qualité « endurance_musculaire » (facteurs d'âge = ceux d'« endurance »),
--        pondérée dans l'AMRAP, le circuit Hyrox et le dead hang ; 0 ailleurs.
-- Aucune campagne n'est épinglée à v1.2 : sans effet sur des résultats existants.
-- À VÉRIFIER AVANT :
--   select count(*) from public.cadences_campaigns c
--     join public.cadences_scale_versions v on v.id = c.scale_version_id
--    where v.test_key = 'decaform' and v.label = 'v1.2';        -- doit rendre 0.
-- Idempotente : peut être rejouée sans effet de bord.
-- ═════════════════════════════════════════════════════════════════

-- 1) Contrainte : 'rm5' accepté (on retire toute contrainte CHECK portant sur variant).
do $$
declare c text;
begin
  for c in
    select conname from pg_constraint
     where conrelid = 'public.cadences_results'::regclass and contype = 'c'
       and pg_get_constraintdef(oid) ilike '%variant%'
  loop
    execute format('alter table public.cadences_results drop constraint %I', c);
  end loop;
  alter table public.cadences_results
    add constraint cadences_results_variant_check
    check (variant is null or variant in ('box', 'plate', 'rm5'));
end $$;

-- 2a) Facteur de conversion 5RM → 3RM.
update public.cadences_scale_versions
   set config = jsonb_set(config, '{rm5_to_3rm}', '1.06'::jsonb)
 where test_key = 'decaform' and label = 'v1.2';

-- 2b) Liste des qualités (8).
update public.cadences_scale_versions
   set config = jsonb_set(config, '{qualities}', $q$[{"key":"vitesse","label":"Vitesse"},{"key":"force","label":"Force"},{"key":"puissance","label":"Puissance"},{"key":"explosivite","label":"Explosivité"},{"key":"endurance","label":"Endurance"},{"key":"endurance_musculaire","label":"Endurance musculaire"},{"key":"vo2max","label":"VO2max"},{"key":"coordination","label":"Coordination"}]$q$::jsonb)
 where test_key = 'decaform' and label = 'v1.2';

-- 2c) Facteurs d'âge : endurance_musculaire = endurance, pour chaque tranche.
update public.cadences_scale_versions
   set config = jsonb_set(config, '{age,pf}', (
     select jsonb_object_agg(k, v || jsonb_build_object('endurance_musculaire', v->'endurance'))
       from jsonb_each(config#>'{age,pf}') as p(k, v)))
 where test_key = 'decaform' and label = 'v1.2';

-- 2d) Poids : endurance_musculaire = 0 sur toutes les épreuves (la clé doit exister)…
update public.cadences_scale_versions
   set config = jsonb_set(config, '{tests}', (
     select jsonb_agg(
              case when jsonb_exists(t->'weights', 'endurance_musculaire') then t
                   else jsonb_set(t, '{weights,endurance_musculaire}', '0'::jsonb) end
              order by ord)
       from jsonb_array_elements(config->'tests') with ordinality as x(t, ord)))
 where test_key = 'decaform' and label = 'v1.2';

-- 2e) …puis les poids exacts de amrap_20min.
update public.cadences_scale_versions
   set config = jsonb_set(config, '{tests}', (
     select jsonb_agg(
              case when t->>'slug' in ('amrap_20min') then jsonb_set(t, '{weights}', $w${"vitesse":0,"force":0.15,"puissance":0.05,"explosivite":0,"endurance":0.15,"endurance_musculaire":0.35,"vo2max":0.3,"coordination":0}$w$::jsonb)
                   else t end
              order by ord)
       from jsonb_array_elements(config->'tests') with ordinality as x(t, ord)))
 where test_key = 'decaform' and label = 'v1.2';

-- 2e) …puis les poids exacts de hyrox_circuit.
update public.cadences_scale_versions
   set config = jsonb_set(config, '{tests}', (
     select jsonb_agg(
              case when t->>'slug' in ('hyrox_circuit') then jsonb_set(t, '{weights}', $w${"vitesse":0,"force":0.15,"puissance":0.05,"explosivite":0,"endurance":0.15,"endurance_musculaire":0.35,"vo2max":0.25,"coordination":0.05}$w$::jsonb)
                   else t end
              order by ord)
       from jsonb_array_elements(config->'tests') with ordinality as x(t, ord)))
 where test_key = 'decaform' and label = 'v1.2';

-- 2e) …puis les poids exacts de dead_hang.
update public.cadences_scale_versions
   set config = jsonb_set(config, '{tests}', (
     select jsonb_agg(
              case when t->>'slug' in ('dead_hang') then jsonb_set(t, '{weights}', $w${"vitesse":0,"force":0.7,"puissance":0,"explosivite":0,"endurance":0,"endurance_musculaire":0.3,"vo2max":0,"coordination":0}$w$::jsonb)
                   else t end
              order by ord)
       from jsonb_array_elements(config->'tests') with ordinality as x(t, ord)))
 where test_key = 'decaform' and label = 'v1.2';

-- 2f) Références abaissées (Réf), max inchangés : squat et soulevé de terre.
update public.cadences_scale_versions
   set config = jsonb_set(config, '{tests}', (
     select jsonb_agg(
              case when t->>'slug' in ('squat_3rm') then jsonb_set(jsonb_set(t, '{male,ref}', '1.25'::jsonb), '{female,ref}', '0.83'::jsonb)
                   else t end
              order by ord)
       from jsonb_array_elements(config->'tests') with ordinality as x(t, ord)))
 where test_key = 'decaform' and label = 'v1.2';

update public.cadences_scale_versions
   set config = jsonb_set(config, '{tests}', (
     select jsonb_agg(
              case when t->>'slug' in ('deadlift_3rm') then jsonb_set(jsonb_set(t, '{male,ref}', '1.6'::jsonb), '{female,ref}', '1.07'::jsonb)
                   else t end
              order by ord)
       from jsonb_array_elements(config->'tests') with ordinality as x(t, ord)))
 where test_key = 'decaform' and label = 'v1.2';

-- 2g) Choix 3RM / 5RM sur les six épreuves.
update public.cadences_scale_versions
   set config = jsonb_set(config, '{tests}', (
     select jsonb_agg(
              case when t->>'slug' in ('squat_3rm', 'bench_press_3rm', 'deadlift_3rm', 'military_press_3rm', 'weighted_pullup_3rm', 'front_squat_3rm') then jsonb_set(t, '{rm_choice}', 'true'::jsonb)
                   else t end
              order by ord)
       from jsonb_array_elements(config->'tests') with ordinality as x(t, ord)))
 where test_key = 'decaform' and label = 'v1.2';

-- Contrôles (à lancer après) : doivent rendre 8 · 1.06 · 6 · 1.25/0.83 · 1.6/1.07 · 0.35/0.35/0.3 (et max 2.25/1.5 · 2.7/1.8).
-- select jsonb_array_length(config->'qualities') q, config->>'rm5_to_3rm' f,
--        (select count(*) from jsonb_array_elements(config->'tests') t where t->>'rm_choice' = 'true') n_rm,
--        (select t#>'{male,ref}' || '/' || (t#>'{female,ref}') from jsonb_array_elements(config->'tests') t where t->>'slug' = 'squat_3rm'),
--        (select t#>'{male,ref}' || '/' || (t#>'{female,ref}') from jsonb_array_elements(config->'tests') t where t->>'slug' = 'deadlift_3rm')
--   from public.cadences_scale_versions where test_key = 'decaform' and label = 'v1.2';
