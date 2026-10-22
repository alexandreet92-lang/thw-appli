-- ═════════════════════════════════════════════════════════════════
-- PROSPECTION PAR EMAIL (admin uniquement) — contacts, envois, réglages.
-- Écrit et lu UNIQUEMENT par le serveur (service role) : RLS activée, aucune policy.
-- Un contact n'est importé qu'avec sa source ET une preuve d'accord (consent_note).
-- Idempotente. Ne touche à aucune table existante.
-- ═════════════════════════════════════════════════════════════════

create table if not exists public.prospect_contacts (
  id               uuid primary key default gen_random_uuid(),
  email            text not null unique,
  first_name       text,
  source           text not null,
  consent_note     text not null,
  consent_at       timestamptz not null default now(),
  status           text not null default 'active'
                     check (status in ('active','unsubscribed','bounced','complained')),
  token            uuid not null default gen_random_uuid(),
  send_failures    int  not null default 0,
  last_sent_at     timestamptz,
  unsubscribed_at  timestamptz,
  created_at       timestamptz not null default now()
);
create unique index if not exists prospect_contacts_token_uq on public.prospect_contacts (token);
create index if not exists prospect_contacts_queue_idx
  on public.prospect_contacts (created_at) where status = 'active' and last_sent_at is null;

create table if not exists public.prospect_sends (
  id               bigint generated always as identity primary key,
  contact_id       uuid not null references public.prospect_contacts(id) on delete cascade,
  sent_at          timestamptz not null default now(),
  status           text not null check (status in ('sent','failed')),
  error            text,
  ses_message_id   text,
  delivery_status  text check (delivery_status in ('delivered','bounced','complained')),
  clicked_at       timestamptz,
  click_count      int not null default 0,
  opened_at        timestamptz,
  open_count       int not null default 0
);
create index if not exists prospect_sends_sent_at_idx on public.prospect_sends (sent_at desc);
create index if not exists prospect_sends_contact_idx on public.prospect_sends (contact_id);
create index if not exists prospect_sends_msg_idx on public.prospect_sends (ses_message_id) where ses_message_id is not null;

create table if not exists public.prospect_settings (
  id              int primary key default 1 check (id = 1),
  enabled         boolean not null default false,
  daily_target    int not null default 100 check (daily_target between 1 and 200),
  send_hour       int not null default 10 check (send_hour between 0 and 23),
  ramp_start      date,
  subject         text not null default 'Des tests pour te situer',
  body            text not null default E'{prenom},\n\nConnais-tu vraiment ta condition physique ?\n\nTHW propose des tests pour y répondre : Decaform, Test de forme dès 8 ans, et des versions adaptées aux débutants, aux ados, aux enfants et aux seniors. Chaque test a son barème par âge et ses vidéos explicatives.\n\nTous les tests : {lien}\n\nL''application Hybrid prolonge ensuite avec le suivi de l''entraînement et l''analyse des séances.\n\nL''équipe THW\n\n{desinscription}',
  from_name       text not null default 'Alexandre de THW',
  from_email      text not null default '',
  postal_address  text not null default '',
  updated_at      timestamptz not null default now()
);
insert into public.prospect_settings (id) values (1) on conflict (id) do nothing;

alter table public.prospect_contacts enable row level security;
alter table public.prospect_sends    enable row level security;
alter table public.prospect_settings enable row level security;

comment on table public.prospect_contacts is 'Contacts de prospection par email (admin). Chaque contact porte sa source et la preuve de son accord.';
comment on table public.prospect_sends    is 'Un envoi = une ligne : statut, livraison (SES), clic et ouverture.';
comment on table public.prospect_settings is 'Réglages uniques (ligne id=1) : objectif quotidien, activation, modèle du message.';
