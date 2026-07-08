-- ══════════════════════════════════════════════════════════════
-- Mémoire long terme du coach IA — faits durables sur l'athlète
-- (préférences, contraintes, objectifs, décisions) que l'IA retient
-- d'une conversation à l'autre. Plafond appliqué par abonnement
-- côté application (voir TIER_LIMITS.memories_max).
-- Additif, RLS stricte (chaque athlète ne voit que ses souvenirs).
-- ══════════════════════════════════════════════════════════════

create table if not exists public.coach_memories (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  content        text not null,
  category       text,
  source_conv_id text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists coach_memories_user_idx
  on public.coach_memories(user_id, created_at desc);

alter table public.coach_memories enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'coach_memories' and policyname = 'coach_memories_select_own') then
    create policy "coach_memories_select_own" on public.coach_memories
      for select using (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'coach_memories' and policyname = 'coach_memories_insert_own') then
    create policy "coach_memories_insert_own" on public.coach_memories
      for insert with check (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'coach_memories' and policyname = 'coach_memories_update_own') then
    create policy "coach_memories_update_own" on public.coach_memories
      for update using (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'coach_memories' and policyname = 'coach_memories_delete_own') then
    create policy "coach_memories_delete_own" on public.coach_memories
      for delete using (auth.uid() = user_id);
  end if;
end $$;
