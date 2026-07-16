-- ══════════════════════════════════════════════════════════════
-- Projets IA : un projet regroupe plusieurs conversations autour d'un
-- même sujet et porte un CONTEXTE / des INSTRUCTIONS partagés que le coach
-- applique dans toutes les conversations du projet. Le rattachement
-- conversation → projet vit dans le JSONB `ai_conversations.data.projectId`
-- (aucune migration nécessaire côté conversations). RLS stricte par user.
-- ══════════════════════════════════════════════════════════════

create table if not exists public.ai_projects (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  name         text not null,
  instructions text not null default '',
  color        text not null default '#5b6fff',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists ai_projects_user_idx on public.ai_projects(user_id, updated_at desc);

alter table public.ai_projects enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='ai_projects' and policyname='ai_projects_select_own') then
    create policy "ai_projects_select_own" on public.ai_projects for select using (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='ai_projects' and policyname='ai_projects_insert_own') then
    create policy "ai_projects_insert_own" on public.ai_projects for insert with check (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='ai_projects' and policyname='ai_projects_update_own') then
    create policy "ai_projects_update_own" on public.ai_projects for update using (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='ai_projects' and policyname='ai_projects_delete_own') then
    create policy "ai_projects_delete_own" on public.ai_projects for delete using (auth.uid() = user_id);
  end if;
end $$;
