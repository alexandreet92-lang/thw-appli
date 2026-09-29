-- ══════════════════════════════════════════════════════════════
-- Achat in-app (Apple / RevenueCat) : traçabilité de la source d'un
-- abonnement, pour que check-quota accorde le tier sur un abonnement
-- Apple actif comme il le fait déjà pour Stripe.
--
--  • store           : 'stripe' | 'app_store' | 'play_store'
--  • provider_sub_id : identifiant d'abonnement côté store (RevenueCat)
--
-- Colonnes nullables, sans valeur par défaut : les lignes Stripe
-- existantes restent inchangées (store NULL = comportement historique).
-- ══════════════════════════════════════════════════════════════

alter table if exists public.user_subscriptions
  add column if not exists store text,
  add column if not exists provider_sub_id text;

alter table if exists public.coach_subscriptions
  add column if not exists store text,
  add column if not exists provider_sub_id text;

-- Idempotence des webhooks RevenueCat : chaque event n'est traité qu'une fois
-- (crucial pour les tokens, sinon un renvoi doublerait le crédit).
create table if not exists public.iap_events (
  event_id    text primary key,
  event_type  text,
  user_id     uuid,
  processed_at timestamptz not null default now()
);

