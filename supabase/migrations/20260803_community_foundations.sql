-- ══════════════════════════════════════════════════════════════════════════
-- COMMUNAUTÉ « type Discord » — Phase 1 (fondations)
--
-- Nouvelle couche DISTINCTE de la messagerie privée existante (coach_messages,
-- message_groups) : espaces (≈ serveurs) → canaux (≈ channels) → messages.
--
-- Hiérarchie :
--   community_spaces   (officiels seedés par THW, ou créés par des utilisateurs)
--   community_channels (plusieurs canaux texte/voix par espace, ordonnés)
--   community_members  (appartenance user↔espace + rôle)
--   community_messages (fil d'un canal, réponses via reply_to)
--   community_message_reactions (Phase 1.5, table posée dès maintenant)
--   community_reads    (dernier message lu par (user, canal) → non-lus)
--
-- RLS OBLIGATOIRE sur chaque table. Pour éviter la récursion RLS et les
-- sous-requêtes par ligne, les tests d'appartenance/rôle passent par des
-- fonctions SECURITY DEFINER STABLE (elles court-circuitent RLS en interne).
--
-- Gating d'abonnement (créer un espace, quotas, privé, voix…) : NON exprimé en
-- SQL (source de vérité = TIER_LIMITS.community_* côté TS). La création d'espace
-- passe donc par /api/community/spaces (service role) APRÈS vérification de
-- l'entitlement + du quota. En conséquence, community_spaces N'A PAS de policy
-- INSERT pour `authenticated` : toute insertion directe est refusée, seul le
-- service role (route API + seed) peut créer un espace. Les autres écritures
-- (rejoindre, poster, réagir, gérer ses canaux en tant qu'owner/admin) sont
-- gouvernées par RLS ci-dessous.
-- ══════════════════════════════════════════════════════════════════════════

-- ── Tables ──────────────────────────────────────────────────────────────────

create table if not exists public.community_spaces (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (length(name) between 1 and 80),
  slug        text not null unique check (slug ~ '^[a-z0-9-]{2,60}$'),
  description text check (length(description) <= 400),
  kind        text not null check (kind in ('official', 'user')),
  sport       text check (sport in ('running', 'cycling', 'hyrox', 'gym')),
  icon_emoji  text not null default '💬' check (length(icon_emoji) <= 8),
  banner_url  text,
  is_public   boolean not null default true,
  created_by  uuid references auth.users(id) on delete set null,
  created_at  timestamptz not null default now()
);

create table if not exists public.community_channels (
  id         uuid primary key default gen_random_uuid(),
  space_id   uuid not null references public.community_spaces(id) on delete cascade,
  name       text not null check (length(name) between 1 and 60),
  topic      text check (length(topic) <= 200),
  position   integer not null default 0,
  kind       text not null default 'text' check (kind in ('text', 'voice')),
  created_at timestamptz not null default now()
);
create index if not exists community_channels_space_idx
  on public.community_channels(space_id, position);

create table if not exists public.community_members (
  space_id  uuid not null references public.community_spaces(id) on delete cascade,
  user_id   uuid not null references auth.users(id) on delete cascade,
  role      text not null default 'member' check (role in ('owner', 'admin', 'coach', 'member')),
  joined_at timestamptz not null default now(),
  primary key (space_id, user_id)
);
create index if not exists community_members_user_idx
  on public.community_members(user_id);

create table if not exists public.community_messages (
  id         uuid primary key default gen_random_uuid(),
  channel_id uuid not null references public.community_channels(id) on delete cascade,
  author_id  uuid not null references auth.users(id) on delete cascade,
  body       text not null check (length(body) between 1 and 4000),
  created_at timestamptz not null default now(),
  edited_at  timestamptz,
  reply_to   uuid references public.community_messages(id) on delete set null
);
create index if not exists community_messages_channel_idx
  on public.community_messages(channel_id, created_at);

create table if not exists public.community_message_reactions (
  message_id uuid not null references public.community_messages(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  emoji      text not null check (length(emoji) <= 16),
  created_at timestamptz not null default now(),
  primary key (message_id, user_id, emoji)
);

create table if not exists public.community_reads (
  user_id      uuid not null references auth.users(id) on delete cascade,
  channel_id   uuid not null references public.community_channels(id) on delete cascade,
  last_read_at timestamptz not null default now(),
  primary key (user_id, channel_id)
);

-- ── Fonctions d'appartenance/rôle (SECURITY DEFINER STABLE) ─────────────────
-- Elles bypassent RLS → pas de récursion, et l'ensemble est évalué une fois par
-- requête (sargable). search_path verrouillé pour la sécurité.

create or replace function public.community_is_member(p_space uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.community_members m
    where m.space_id = p_space and m.user_id = (select auth.uid())
  );
$$;

create or replace function public.community_role(p_space uuid)
returns text
language sql stable security definer
set search_path = public
as $$
  select m.role from public.community_members m
  where m.space_id = p_space and m.user_id = (select auth.uid())
  limit 1;
$$;

create or replace function public.community_can_moderate(p_space uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.community_members m
    where m.space_id = p_space and m.user_id = (select auth.uid())
      and m.role in ('owner', 'admin')
  );
$$;

create or replace function public.community_space_is_public(p_space uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select coalesce((select s.is_public from public.community_spaces s where s.id = p_space), false);
$$;

create or replace function public.community_channel_space(p_channel uuid)
returns uuid
language sql stable security definer
set search_path = public
as $$
  select c.space_id from public.community_channels c where c.id = p_channel;
$$;

create or replace function public.community_message_space(p_message uuid)
returns uuid
language sql stable security definer
set search_path = public
as $$
  select c.space_id
  from public.community_messages msg
  join public.community_channels c on c.id = msg.channel_id
  where msg.id = p_message;
$$;

-- Ces helpers SECURITY DEFINER ne servent qu'aux policies RLS (rôle authenticated).
-- On retire l'EXECUTE de PUBLIC/anon (pas d'appel direct via PostgREST RPC) et on le
-- réserve à authenticated, requis pour que les policies puissent les évaluer.
do $$
declare fn text;
begin
  foreach fn in array array[
    'public.community_is_member(uuid)',
    'public.community_role(uuid)',
    'public.community_can_moderate(uuid)',
    'public.community_space_is_public(uuid)',
    'public.community_channel_space(uuid)',
    'public.community_message_space(uuid)'
  ] loop
    execute format('revoke all on function %s from public, anon', fn);
    execute format('grant execute on function %s to authenticated', fn);
  end loop;
end $$;

-- ── RLS ─────────────────────────────────────────────────────────────────────

alter table public.community_spaces             enable row level security;
alter table public.community_channels           enable row level security;
alter table public.community_members            enable row level security;
alter table public.community_messages           enable row level security;
alter table public.community_message_reactions  enable row level security;
alter table public.community_reads              enable row level security;

-- community_spaces : lecture si public OU membre. Modération (édition/branding)
-- par owner/admin ; suppression par owner. AUCUN insert authenticated (voir
-- en-tête : création via service role /api/community/spaces).
create policy community_spaces_select on public.community_spaces
  for select to authenticated
  using (is_public or public.community_is_member(id));

create policy community_spaces_update on public.community_spaces
  for update to authenticated
  using (public.community_can_moderate(id))
  with check (public.community_can_moderate(id));

create policy community_spaces_delete on public.community_spaces
  for delete to authenticated
  using (public.community_role(id) = 'owner');

-- community_channels : lecture si espace public ou membre. Écriture (create /
-- edit / delete) réservée owner/admin de l'espace (gating voix vérifié en plus
-- côté API pour les canaux 'voice', Phase 2).
create policy community_channels_select on public.community_channels
  for select to authenticated
  using (public.community_space_is_public(space_id) or public.community_is_member(space_id));

create policy community_channels_insert on public.community_channels
  for insert to authenticated
  with check (public.community_can_moderate(space_id));

create policy community_channels_update on public.community_channels
  for update to authenticated
  using (public.community_can_moderate(space_id))
  with check (public.community_can_moderate(space_id));

create policy community_channels_delete on public.community_channels
  for delete to authenticated
  using (public.community_can_moderate(space_id));

-- community_members : liste visible aux membres (et sur espace public). Un user
-- s'insère LUI-MÊME pour rejoindre un espace public, rôle forcé 'member'. La
-- gestion des rôles (promotion) est réservée à l'owner → personne ne s'auto-
-- promeut. Un membre peut se retirer lui-même ; owner/admin peuvent retirer.
create policy community_members_select on public.community_members
  for select to authenticated
  using (public.community_space_is_public(space_id) or public.community_is_member(space_id));

create policy community_members_insert on public.community_members
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and role = 'member'
    and public.community_space_is_public(space_id)
  );

create policy community_members_update on public.community_members
  for update to authenticated
  using (public.community_role(space_id) = 'owner')
  with check (public.community_role(space_id) = 'owner');

create policy community_members_delete on public.community_members
  for delete to authenticated
  using (user_id = (select auth.uid()) or public.community_can_moderate(space_id));

-- community_messages : lecture si membre de l'espace du canal ; insert si membre
-- ET author_id = auth.uid() ; édition par l'auteur ; suppression par l'auteur ou
-- par owner/admin (modération).
create policy community_messages_select on public.community_messages
  for select to authenticated
  using (public.community_is_member(public.community_channel_space(channel_id)));

create policy community_messages_insert on public.community_messages
  for insert to authenticated
  with check (
    author_id = (select auth.uid())
    and public.community_is_member(public.community_channel_space(channel_id))
  );

create policy community_messages_update on public.community_messages
  for update to authenticated
  using (author_id = (select auth.uid()))
  with check (author_id = (select auth.uid()));

create policy community_messages_delete on public.community_messages
  for delete to authenticated
  using (
    author_id = (select auth.uid())
    or public.community_can_moderate(public.community_channel_space(channel_id))
  );

-- community_message_reactions : lecture pour les membres de l'espace ; un user
-- pose/retire ses propres réactions.
create policy community_reactions_select on public.community_message_reactions
  for select to authenticated
  using (public.community_is_member(public.community_message_space(message_id)));

create policy community_reactions_insert on public.community_message_reactions
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and public.community_is_member(public.community_message_space(message_id))
  );

create policy community_reactions_delete on public.community_message_reactions
  for delete to authenticated
  using (user_id = (select auth.uid()));

-- community_reads : chacun ne voit et n'écrit que ses propres marqueurs de lecture.
create policy community_reads_select on public.community_reads
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy community_reads_insert on public.community_reads
  for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy community_reads_update on public.community_reads
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- ── Realtime ────────────────────────────────────────────────────────────────
-- Append en direct des messages (et réactions) filtré par channel_id côté client.
do $$
begin
  begin
    alter publication supabase_realtime add table public.community_messages;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.community_message_reactions;
  exception when duplicate_object then null;
  end;
end $$;

-- ── Seed des espaces officiels (service role / owner de migration) ──────────
-- 5 espaces THW : Communauté générale + un par sport supporté. Chaque espace
-- reçoit 4 canaux texte de base. Idempotent via ON CONFLICT (slug).

insert into public.community_spaces (name, slug, description, kind, sport, icon_emoji, is_public)
values
  ('THW Communauté', 'thw-communaute', 'L''espace général de la communauté THW — échanges, entraide et actus.', 'official', null,      '💬', true),
  ('Running',        'running',        'Course à pied : plans, allures, technique et compétitions.',              'official', 'running', '🏃', true),
  ('Cycling',        'cycling',        'Vélo route & home-trainer : puissance, matériel, sorties.',               'official', 'cycling', '🚴', true),
  ('Hyrox',          'hyrox',          'Hyrox & hybride : préparation, stations, races.',                         'official', 'hyrox',   '🔥', true),
  ('Gym',            'gym',            'Renforcement & force : programmation, technique, nutrition.',             'official', 'gym',     '🏋️', true)
on conflict (slug) do nothing;

-- Canaux de base pour chaque espace officiel (idempotent : on n'insère que si le
-- couple (space, name) n'existe pas déjà).
insert into public.community_channels (space_id, name, topic, position, kind)
select s.id, ch.name, ch.topic, ch.position, 'text'
from public.community_spaces s
cross join (values
  ('général',      'Discussions générales',            0),
  ('technique',    'Technique & conseils',             1),
  ('nutrition',    'Alimentation & récupération',      2),
  ('compétitions', 'Objectifs, courses et résultats',  3)
) as ch(name, topic, position)
where s.kind = 'official'
  and not exists (
    select 1 from public.community_channels c
    where c.space_id = s.id and c.name = ch.name
  );
