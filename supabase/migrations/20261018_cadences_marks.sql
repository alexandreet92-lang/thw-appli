-- ═════════════════════════════════════════════════════════════════
-- CADENCES — « marques » de l'utilisateur sur sa courbe d'historique :
--   · objectif  (kind = 'goal')  : une cible chiffrée sur une mesure ;
--   · événement (kind = 'event') : une date + un libellé (blessure, début de prépa…).
-- NON appliquée sans OK d'Alex. Idempotente. Sans effet sur les tables existantes.
-- Tant qu'elle n'est pas appliquée, le site masque simplement ces deux fonctions.
-- ═════════════════════════════════════════════════════════════════
create table if not exists public.cadences_marks (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  kind        text not null check (kind in ('goal','event')),
  test_key    text not null default 'decaform',
  metric      text,                       -- 'global' | 'q:<qualité>' | 't:<épreuve>' (objectif seulement)
  target      numeric,                    -- valeur cible (objectif seulement)
  on_date     date,                       -- date (événement seulement)
  label       text not null check (char_length(label) between 1 and 80),
  created_at  timestamptz not null default now(),
  constraint cadences_marks_shape check (
    (kind = 'goal'  and metric is not null and target is not null) or
    (kind = 'event' and on_date is not null)
  )
);
create index if not exists cadences_marks_user_idx on public.cadences_marks (user_id, kind, on_date);

alter table public.cadences_marks enable row level security;
drop policy if exists cadences_marks_sel on public.cadences_marks;
drop policy if exists cadences_marks_ins on public.cadences_marks;
drop policy if exists cadences_marks_del on public.cadences_marks;
create policy cadences_marks_sel on public.cadences_marks for select to authenticated using (user_id = auth.uid());
create policy cadences_marks_ins on public.cadences_marks for insert to authenticated with check (user_id = auth.uid());
create policy cadences_marks_del on public.cadences_marks for delete to authenticated using (user_id = auth.uid());
