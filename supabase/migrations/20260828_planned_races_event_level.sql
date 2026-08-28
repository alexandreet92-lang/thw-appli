-- Élargit la contrainte de priorité des objectifs calendrier pour accepter le
-- type « Événement / Défi » (level = 'event', rendu en rose). Widening only :
-- aucune donnée existante n'est invalidée.
alter table public.planned_races drop constraint if exists planned_races_level_check;
alter table public.planned_races add constraint planned_races_level_check
  check (level = any (array['secondary'::text, 'important'::text, 'main'::text, 'gty'::text, 'event'::text]));
