-- Accès offert par l'admin (feature « accès gratuit »).
-- Appliquée à la production le 2026-09-28. Ce fichier garde la trace.
--
-- Coach : accès offert jusqu'à cette date (NULL = pas d'accès offert). Indépendant
-- de coach_subscribed (Stripe) et de l'essai 14 j.
alter table public.profiles
  add column if not exists coach_access_until timestamptz;

comment on column public.profiles.coach_access_until is
  'Accès coach OFFERT par l''admin, actif tant que > now(). NULL = aucun. Indépendant de coach_subscribed (Stripe) et de l''essai 14 j.';

-- Table d'audit / liste des accès offerts. Lue par l'écran admin uniquement ;
-- le gating, lui, lit les colonnes existantes (aucune requête en plus).
create table if not exists public.comp_grants (
  user_id     uuid        not null references auth.users(id) on delete cascade,
  kind        text        not null check (kind in ('coach', 'athlete')),
  tier        text,
  until       timestamptz,           -- NULL = illimité
  granted_by  text,
  created_at  timestamptz not null default now(),
  primary key (user_id, kind)
);

comment on table public.comp_grants is
  'Accès gratuits accordés par l''admin (audit + liste). Source de vérité de l''écran, pas du gating.';

alter table public.comp_grants enable row level security;
-- Aucune policy : seul le service role (routes admin serveur) y accède.
