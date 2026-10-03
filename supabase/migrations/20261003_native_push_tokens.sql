-- ══════════════════════════════════════════════════════════════
-- Notifications push NATIVES (app iOS « Hybrid », APNs).
-- Chaque iPhone enregistre son jeton APNs (hex) via POST /api/push/native.
-- L'envoi (src/lib/push/send.ts → apns.ts) lit cette table avec le client
-- service. Distincte de push_subscriptions (Web Push : endpoint + clés VAPID).
--
-- NON appliquée automatiquement : à exécuter une fois en production
-- (Supabase › SQL Editor, ou `supabase db push`). Idempotente. N'impacte
-- aucune donnée existante.
-- ══════════════════════════════════════════════════════════════

create table if not exists public.native_push_tokens (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  token           text not null unique,
  platform        text not null default 'ios' check (platform in ('ios', 'android')),
  -- Passerelle APNs qui accepte ce jeton (build Debug = sandbox ; TestFlight /
  -- App Store = production). NULL = inconnue → APNS_PRODUCTION.
  environment     text check (environment in ('production', 'sandbox')),
  bundle_id       text,
  user_agent      text,
  last_success_at timestamptz,
  last_error      text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists native_push_tokens_user_idx on public.native_push_tokens(user_id);

alter table public.native_push_tokens enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='native_push_tokens' and policyname='native_push_tokens_select_own') then
    create policy "native_push_tokens_select_own" on public.native_push_tokens for select using (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='native_push_tokens' and policyname='native_push_tokens_insert_own') then
    create policy "native_push_tokens_insert_own" on public.native_push_tokens for insert with check (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='native_push_tokens' and policyname='native_push_tokens_update_own') then
    create policy "native_push_tokens_update_own" on public.native_push_tokens for update using (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='native_push_tokens' and policyname='native_push_tokens_delete_own') then
    create policy "native_push_tokens_delete_own" on public.native_push_tokens for delete using (auth.uid() = user_id);
  end if;
end $$;
