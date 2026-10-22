-- Articles du site : état par membre (lu / enregistré).
-- Une ligne par (membre, article). Le contenu des articles n'est PAS en base : il est servi par
-- /api/articles/[slug], qui ne renvoie le texte complet qu'aux membres connectés.
-- RLS : chacun ne voit et ne modifie que ses propres lignes.

create table if not exists public.article_user_state (
  user_id    uuid not null references auth.users(id) on delete cascade,
  slug       text not null check (char_length(slug) between 1 and 120),
  read_at    timestamptz,
  saved_at   timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_id, slug)
);

create index if not exists article_user_state_user_idx on public.article_user_state (user_id);

alter table public.article_user_state enable row level security;

create policy "article_user_state_select_own" on public.article_user_state
  for select using (auth.uid() = user_id);
create policy "article_user_state_insert_own" on public.article_user_state
  for insert with check (auth.uid() = user_id);
create policy "article_user_state_update_own" on public.article_user_state
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "article_user_state_delete_own" on public.article_user_state
  for delete using (auth.uid() = user_id);

comment on table public.article_user_state is
  'Articles du site vitrine : marqué comme lu (read_at) et enregistré sur le compte (saved_at), par membre.';
