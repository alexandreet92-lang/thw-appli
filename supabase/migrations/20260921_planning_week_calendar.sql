-- ══════════════════════════════════════════════════════════════════════════
-- Planning Week — agenda général façon Google Agenda (Phase A : données).
-- Tables : agenda_calendars (couches colorées), agenda_events (événements perso
-- horodatés), google_calendar_connections (sync 2 sens). Extension de
-- planned_sessions (heures début/fin + rappel + couleur) pour la grille horaire.
--
-- NB : la table calendar_events existe déjà (objectifs/événements de la page
-- Objectifs, basés sur une date) → NON réutilisée ici. La page Planning Week la
-- LIT en plus, en lecture. Nos événements perso horodatés vont dans agenda_events.
--
-- Colonnes additives → aucune donnée existante impactée. RLS par utilisateur.
-- ══════════════════════════════════════════════════════════════════════════

-- ── 1. Couches d'agenda ────────────────────────────────────────────────────
create table if not exists public.agenda_calendars (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users(id) on delete cascade,
  name                text not null,
  color               text not null default '#3B82F6',
  kind                text not null default 'personal',   -- training | races | objectives | personal | google
  visible             boolean not null default true,
  is_default          boolean not null default false,
  google_calendar_id  text,
  sort                int not null default 0,
  created_at          timestamptz not null default now()
);
create index if not exists agenda_calendars_user_idx on public.agenda_calendars(user_id);

-- ── 2. Événements perso horodatés ─────────────────────────────────────────
create table if not exists public.agenda_events (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users(id) on delete cascade,
  calendar_id         uuid references public.agenda_calendars(id) on delete set null,
  title               text not null default '',
  description         text,
  location            text,
  starts_at           timestamptz not null,
  ends_at             timestamptz not null,
  all_day             boolean not null default false,
  color               text,
  rrule               text,                -- récurrence iCal (ex. FREQ=WEEKLY;BYDAY=MO)
  reminder_min        int,                 -- minutes avant (null = défaut 30 ; -1 = aucun)
  reminder_sent_for   text,
  google_event_id     text,
  google_calendar_id  text,
  source              text not null default 'app',   -- app | google
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index if not exists agenda_events_user_time_idx on public.agenda_events(user_id, starts_at);
create index if not exists agenda_events_google_idx on public.agenda_events(user_id, google_event_id);

-- ── 3. Extension planned_sessions : heures + rappel + couleur + lien Google ─
alter table public.planned_sessions
  add column if not exists starts_at       timestamptz,
  add column if not exists ends_at         timestamptz,
  add column if not exists reminder_min    int,
  add column if not exists color           text,
  add column if not exists google_event_id text;

-- ── 4. Connexion Google Agenda (tokens server-only) ───────────────────────
create table if not exists public.google_calendar_connections (
  user_id                uuid primary key references auth.users(id) on delete cascade,
  google_email           text,
  access_token           text,
  refresh_token          text,
  token_expiry           timestamptz,
  sync_token             text,
  primary_google_id      text,
  suppress_app_reminders boolean not null default true,
  connected_at           timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

-- ── 5. RLS ────────────────────────────────────────────────────────────────
alter table public.agenda_calendars              enable row level security;
alter table public.agenda_events                 enable row level security;
alter table public.google_calendar_connections   enable row level security;

do $$ begin
  create policy agenda_calendars_owner on public.agenda_calendars
    for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy agenda_events_owner on public.agenda_events
    for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
exception when duplicate_object then null; end $$;
-- Tokens OAuth server-only : PAS de policy SELECT client (jamais lisibles par
-- le navigateur) ; tout passe par les routes serveur (service role).
do $$ begin
  create policy gcal_conn_delete on public.google_calendar_connections
    for delete using (auth.uid() = user_id);
exception when duplicate_object then null; end $$;
