-- Lien stage (race_events) -> seances planning (planned_sessions).
-- Colonnes additives nullable : permettent de retrouver / synchroniser /
-- supprimer les seances generees depuis un jour de stage du calendrier.
alter table public.planned_sessions
  add column if not exists source_event_id uuid,
  add column if not exists source_event_date date;

create index if not exists idx_planned_sessions_source_event
  on public.planned_sessions (source_event_id, source_event_date);
