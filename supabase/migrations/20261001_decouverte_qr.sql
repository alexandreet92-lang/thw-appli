-- Découverte Hybrid — QR publics déposés chez des partenaires (restaurants…)
-- qui ouvrent le test physique gratuit sur le site (/defi). Suivi anonyme.
-- Appliquée à la production (thw-v2 / sfrcnyzntgrxlwlmwifi) le 2026-10-01.
-- Ce fichier garde la trace. N'impacte AUCUNE donnée existante.

create table if not exists public.decouverte_sources (
  code          text primary key,            -- slug court et unique, encodé dans le QR
  etablissement text not null,
  metier        text,
  tables        integer not null default 0,  -- 0 = pas de tables ; N = tables 1..N
  ville         text,
  note          text,
  created_at    timestamptz not null default now()
);

comment on table public.decouverte_sources is
  'QR Découverte Hybrid : un code par établissement partenaire. Le QR ouvre /defi?s=<code>[&t=<table>].';

create table if not exists public.decouverte_participations (
  id           uuid primary key default gen_random_uuid(),
  code         text references public.decouverte_sources(code) on delete set null,
  table_no     integer,
  etape        text not null default 'ouvert'
                 check (etape in ('ouvert','commence','termine')),
  score        jsonb,
  commentaire  text,
  compte_cree  boolean not null default false,
  user_id      uuid,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists decouverte_participations_code_idx
  on public.decouverte_participations (code, created_at desc);

comment on table public.decouverte_participations is
  'Une participation = une ouverture du test Découverte via un QR. etape: ouvert<commence<termine. commentaire = avis libre.';

alter table public.decouverte_sources enable row level security;
alter table public.decouverte_participations enable row level security;
-- Aucune policy : accès uniquement via le service role (routes serveur).
