-- Groupes/dossiers d'athlètes + note privée du coach, portés par le lien
-- coach_athlete. La RLS existante (coach met à jour ses propres liens) couvre
-- l'écriture ; aucune nouvelle politique nécessaire.
--
-- Appliqué sur thw-v2 le 2026-07-30 (coach_athlete_group_note).

alter table public.coach_athlete add column if not exists group_name text;
alter table public.coach_athlete add column if not exists coach_note text;
create index if not exists coach_athlete_group_idx on public.coach_athlete(coach_id, group_name);
