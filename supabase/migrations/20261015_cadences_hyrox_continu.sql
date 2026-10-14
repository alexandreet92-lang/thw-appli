-- ═════════════════════════════════════════════════════════════════
-- DECAFORM v1.2 — phase 18 : l'AMRAP disparaît, le Hyrox devient un circuit CONTINU
-- à 7 stations (rameur, burpees, thrusters, tractions, fentes lestées, pompes,
-- soulevé de terre), 140 pts, un seul chrono. (SCHÉMA + DONNÉES)
-- NON appliquée sans OK d'Alex. À jouer APRÈS 20261014_cadences_rm5.sql.
--
-- 1) Élargit le CHECK de cadences_results.equipment à 'elastique' (tractions à
--    l'élastique / australiennes : +5 % sur le temps). Les tractions strictes = null.
-- 2) Met à jour la ligne ACTIVE decaform v1.2 par petites requêtes :
--      · retire amrap_20min (60 pts) et hyrox_circuit (80 pts) ;
--      · ajoute hyrox_continu (140 pts, jour 12, 7 stations additionnées,
--        H Réf 2220 s / Max 1550 s · F Réf 2400 s / Max 1700 s — ESTIMATIONS à caler) ;
--      · le jour 8 devient un jour de repos ; max_days = 15 (durée maximale conseillée).
-- Total toujours 1000 pts ; endurance musculaire inchangée (57,4 pts).
-- Aucune campagne n'est épinglée à v1.2 : sans effet sur des résultats existants.
-- À VÉRIFIER AVANT :
--   select count(*) from public.cadences_campaigns c
--     join public.cadences_scale_versions v on v.id = c.scale_version_id
--    where v.test_key = 'decaform' and v.label = 'v1.2';        -- doit rendre 0.
-- Idempotente : peut être rejouée sans effet de bord.
-- ═════════════════════════════════════════════════════════════════

-- 1) Contrainte : 'elastique' accepté pour equipment.
do $$
declare c text;
begin
  for c in
    select conname from pg_constraint
     where conrelid = 'public.cadences_results'::regclass and contype = 'c'
       and pg_get_constraintdef(oid) ilike '%equipment%'
  loop
    execute format('alter table public.cadences_results drop constraint %I', c);
  end loop;
  alter table public.cadences_results
    add constraint cadences_results_equipment_check
    check (equipment is null or equipment in ('normales', 'pointes', 'sans', 'ceinture', 'elastique'));
end $$;

-- 2a) Retrait de l'AMRAP et de l'ancien circuit Hyrox en 5 tours.
update public.cadences_scale_versions
   set config = jsonb_set(config, '{tests}', (
     select coalesce(jsonb_agg(t order by ord), '[]'::jsonb)
       from jsonb_array_elements(config->'tests') with ordinality as x(t, ord)
      where t->>'slug' not in ('amrap_20min', 'hyrox_circuit')))
 where test_key = 'decaform' and label = 'v1.2';

-- 2b) Ajout du circuit Hyrox continu (en fin de liste, une seule fois).
update public.cadences_scale_versions
   set config = jsonb_set(config, '{tests}', (config->'tests') || $t$[{"slug":"hyrox_continu","group":"Hyrox","name":"Circuit Hyrox continu (7 stations, temps total)","unit":"s","direction":"lower_is_better","kind":"abs","pts_max":140,"male":{"ref":2220,"max":1550},"female":{"ref":2400,"max":1700},"weights":{"vitesse":0,"force":0.15,"puissance":0.05,"explosivite":0,"endurance":0.15,"endurance_musculaire":0.35,"vo2max":0.25,"coordination":0.05},"day":12,"order_in_day":1,"equipment":{"field":"tractions","applies_when":"elastique","pct":0.05,"rule":"result_x_(1+pct)"},"age_time_exponent":1,"attempts":7,"aggregate":"sum"}]$t$::jsonb)
 where test_key = 'decaform' and label = 'v1.2'
   and not exists (select 1 from jsonb_array_elements(config->'tests') t where t->>'slug' = 'hyrox_continu');

-- 2c) Jours : le jour 8 devient un jour de repos.
update public.cadences_scale_versions
   set config = jsonb_set(config, '{days}', $d$[{"day":1,"label":"Haltérophilie","rest":false},{"day":2,"label":"Sauts / Sprints / Agilité","rest":false},{"day":3,"label":"Natation","rest":false},{"day":4,"label":"Force","rest":false},{"day":5,"label":"Repos","rest":true},{"day":6,"label":"400 m + La Chimère + 6.200","rest":false},{"day":7,"label":"Vélo (20 min)","rest":false},{"day":8,"label":"Repos","rest":true},{"day":9,"label":"Repos","rest":true},{"day":10,"label":"3200 m","rest":false},{"day":11,"label":"Repos","rest":true},{"day":12,"label":"Hyrox","rest":false}]$d$::jsonb)
 where test_key = 'decaform' and label = 'v1.2';

-- 2d) Durée maximale conseillée pour passer tout le test.
update public.cadences_scale_versions
   set config = jsonb_set(config, '{max_days}', '15'::jsonb)
 where test_key = 'decaform' and label = 'v1.2';

-- Contrôles (à lancer après) : doivent rendre 24 · 140 · 1000 · 15.
-- select jsonb_array_length(config->'tests') n,
--        (select (t->>'pts_max')::int from jsonb_array_elements(config->'tests') t where t->>'slug' = 'hyrox_continu') hyrox,
--        (select sum((t->>'pts_max')::int) from jsonb_array_elements(config->'tests') t) total,
--        config->>'max_days' max_days
--   from public.cadences_scale_versions where test_key = 'decaform' and label = 'v1.2';
