-- Statistiques du site : mesure d'audience anonyme, hébergée chez nous (sans cookie).
-- Écrite UNIQUEMENT par /api/t (service role) ; lue UNIQUEMENT par le Cockpit admin.
-- RLS activée sans aucune policy : aucun accès via la clé publique.
-- vid = empreinte journalière (IP + navigateur + sel + jour) : l'IP n'est jamais stockée
-- et l'empreinte change chaque jour, elle ne permet donc pas de suivre quelqu'un.
-- sid = identifiant de session (sessionStorage), détruit à la fermeture de l'onglet.

create table if not exists public.site_hits (
  id        bigint generated always as identity primary key,
  at        timestamptz not null default now(),
  sid       text,
  vid       text,
  event     text not null,
  path      text,
  ref_host  text,
  source    text,
  medium    text,
  campaign  text,
  qr_code   text,
  device    text,
  browser   text,
  country   text,
  lang      text,
  props     jsonb not null default '{}'::jsonb,
  user_id   uuid
);

create index if not exists site_hits_at_idx        on public.site_hits (at desc);
create index if not exists site_hits_event_at_idx  on public.site_hits (event, at desc);
create index if not exists site_hits_sid_idx       on public.site_hits (sid);
create index if not exists site_hits_user_idx      on public.site_hits (user_id) where user_id is not null;

alter table public.site_hits enable row level security;

comment on table public.site_hits is
  'Mesure d''audience anonyme (pages vues, étapes de tests, inscriptions). Écrit par /api/t, lu par le Cockpit admin uniquement.';
