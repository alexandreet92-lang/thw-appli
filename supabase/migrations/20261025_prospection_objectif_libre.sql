-- Prospection : l'objectif quotidien n'est plus plafonné à 200 (réglé librement par l'admin).
alter table public.prospect_settings drop constraint if exists prospect_settings_daily_target_check;
alter table public.prospect_settings add constraint prospect_settings_daily_target_check check (daily_target >= 1);
