-- ══════════════════════════════════════════════════════════════════
-- CADENCES — conditions de passage par épreuve.
-- Pour les épreuves en extérieur (sprints, agilité, courses) et le vélo mis
-- en extérieur, on enregistre la température et la météo du jour : un score
-- plus bas n'est pas forcément une régression si les conditions diffèrent.
-- Colonnes NULLABLES (les tests déjà enregistrés restent valides).
-- Migration de données pure : aucune reprise nécessaire.
-- ══════════════════════════════════════════════════════════════════

alter table public.cadences_results
  add column if not exists venue         text,
  add column if not exists temperature_c numeric,
  add column if not exists weather       text;

-- 'indoor' (intérieur) | 'outdoor' (extérieur). Null = non renseigné (ancien test).
alter table public.cadences_results
  drop constraint if exists cadences_results_venue_check;
alter table public.cadences_results
  add constraint cadences_results_venue_check
  check (venue is null or venue in ('indoor', 'outdoor'));

-- Garde-fou de plausibilité pour la température (°C).
alter table public.cadences_results
  drop constraint if exists cadences_results_temperature_check;
alter table public.cadences_results
  add constraint cadences_results_temperature_check
  check (temperature_c is null or (temperature_c >= -30 and temperature_c <= 55));

comment on column public.cadences_results.venue         is 'Lieu de l''épreuve : indoor | outdoor (null = non renseigné).';
comment on column public.cadences_results.temperature_c is 'Température en °C au moment de l''épreuve (extérieur).';
comment on column public.cadences_results.weather       is 'Météo courte (ex. sec, pluie, vent, chaleur, froid) — extérieur.';
