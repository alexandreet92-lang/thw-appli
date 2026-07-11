-- ══════════════════════════════════════════════════════════════
-- Notifications push (Web Push / VAPID) : chaque appareil enregistre
-- son abonnement push. Sert à notifier l'athlète quand le coach a fini
-- de générer une réponse alors que l'app est fermée / en arrière-plan.
-- RLS stricte : chacun ne voit et ne gère que ses propres abonnements.
-- ══════════════════════════════════════════════════════════════

create table if not exists public.push_subscriptions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  endpoint   text not null,
  p256dh     text not null,
  auth       text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (endpoint)
);

create index if not exists push_subscriptions_user_idx
  on public.push_subscriptions(user_id);

alter table public.push_subscriptions enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='push_subscriptions' and policyname='push_subscriptions_select_own') then
    create policy "push_subscriptions_select_own" on public.push_subscriptions for select using (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='push_subscriptions' and policyname='push_subscriptions_insert_own') then
    create policy "push_subscriptions_insert_own" on public.push_subscriptions for insert with check (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='push_subscriptions' and policyname='push_subscriptions_update_own') then
    create policy "push_subscriptions_update_own" on public.push_subscriptions for update using (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='push_subscriptions' and policyname='push_subscriptions_delete_own') then
    create policy "push_subscriptions_delete_own" on public.push_subscriptions for delete using (auth.uid() = user_id);
  end if;
end $$;
