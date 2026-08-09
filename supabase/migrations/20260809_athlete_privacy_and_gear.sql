-- ══════════════════════════════════════════════════════════════════════════
-- ④ Confidentialité athlète (masquage par donnée, global + par activité)
-- ⑤ Matériel : lien manuel vélo / chaussures sur une activité
-- ③ Analyse complète d'une activité PARTAGÉE dans un canal (autorisée par
--    l'appartenance à l'espace, masques respectés).
-- ══════════════════════════════════════════════════════════════════════════

-- ── ④ Colonnes ──────────────────────────────────────────────────────────────
-- Masquage global par défaut de l'athlète : catégories parmi
-- 'hr' | 'watts' | 'pace' | 'speed' | 'kcal'.
alter table public.profiles
  add column if not exists activity_hidden_data text[] not null default '{}';

-- Override par activité (null = hérite du réglage global).
alter table public.activities
  add column if not exists visibility  text,
  add column if not exists hidden_data text[];

-- ── ⑤ Matériel manuel sur l'activité (en plus de strava_gear_id auto) ────────
alter table public.activities
  add column if not exists bike_id  uuid references public.user_bikes(id)         on delete set null,
  add column if not exists shoes_id uuid references public.user_running_shoes(id) on delete set null;

create index if not exists idx_activities_bike  on public.activities(bike_id)  where bike_id  is not null;
create index if not exists idx_activities_shoes on public.activities(shoes_id) where shoes_id is not null;

-- ── Helper de masquage : retire les données des catégories cachées d'un jsonb ─
-- 'hr'    → avg_hr, max_hr, streams.heartrate
-- 'watts' → avg_watts, max_watts, normalized_watts, streams.watts
-- 'pace'  → avg_pace_s_km, streams.velocity (allure = dérivée de la vitesse)
-- 'speed' → avg_speed_ms, max_speed_ms, streams.velocity
-- 'kcal'  → calories, kilojoules
create or replace function public._apply_activity_masks(j jsonb, cats text[])
returns jsonb
language plpgsql
immutable
set search_path to ''
as $$
declare s jsonb;
begin
  if j is null or cats is null or array_length(cats, 1) is null then return j; end if;
  s := coalesce(j->'streams', 'null'::jsonb);

  if 'hr' = any(cats) then
    j := jsonb_set(jsonb_set(j, '{avg_hr}', 'null'::jsonb), '{max_hr}', 'null'::jsonb);
    if s ? 'heartrate' then s := s - 'heartrate'; end if;
  end if;
  if 'watts' = any(cats) then
    j := jsonb_set(jsonb_set(jsonb_set(j, '{avg_watts}', 'null'::jsonb), '{max_watts}', 'null'::jsonb), '{normalized_watts}', 'null'::jsonb);
    if s ? 'watts' then s := s - 'watts'; end if;
  end if;
  if 'kcal' = any(cats) then
    j := jsonb_set(jsonb_set(j, '{calories}', 'null'::jsonb), '{kilojoules}', 'null'::jsonb);
  end if;
  if 'pace' = any(cats) then
    j := jsonb_set(j, '{avg_pace_s_km}', 'null'::jsonb);
    if s ? 'velocity' then s := s - 'velocity'; end if;
  end if;
  if 'speed' = any(cats) then
    j := jsonb_set(jsonb_set(j, '{avg_speed_ms}', 'null'::jsonb), '{max_speed_ms}', 'null'::jsonb);
    if s ? 'velocity' then s := s - 'velocity'; end if;
  end if;

  if j ? 'streams' then j := jsonb_set(j, '{streams}', s); end if;
  return j;
end $$;

-- ── activity_detail : visibilité (override activité → global) + masques ───────
create or replace function public.activity_detail(act_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  owner uuid; me uuid := auth.uid();
  gvis text; avis text; vis text; can boolean;
  ghide text[]; ahide text[]; hide text[]; base jsonb;
begin
  select user_id, visibility, hidden_data into owner, avis, ahide from public.activities where id = act_id;
  if owner is null then return jsonb_build_object('can_view', false); end if;

  select coalesce(activity_visibility, 'public'), coalesce(activity_hidden_data, '{}')
    into gvis, ghide from public.profiles where id = owner;
  vis := coalesce(avis, gvis, 'public');

  if me = owner then can := true;
  elsif vis = 'public' then can := true;
  elsif vis = 'followers' then can := (me is not null) and exists(select 1 from public.follows where follower_id = me and following_id = owner);
  else can := false; end if;
  if not can then return jsonb_build_object('can_view', false); end if;

  base := (
    select jsonb_build_object(
      'can_view', true,
      'zones', coalesce((select jsonb_agg(to_jsonb(z)) from public.training_zones z where z.user_id = owner and z.is_current), '[]'::jsonb)
    ) || (to_jsonb(a) - 'raw_data')
    from public.activities a where a.id = act_id
  );

  if me is distinct from owner then
    hide := coalesce(ahide, ghide, '{}');
    base := public._apply_activity_masks(base, hide);
  end if;
  return base;
end $$;

-- ── ③ Détail d'une activité PARTAGÉE dans un canal ───────────────────────────
-- Autorisé si le demandeur est membre de l'espace du canal ET que l'activité
-- a réellement été partagée dans ce canal (anti-énumération). Le partage vaut
-- consentement : on ignore la visibilité follow/privé, mais on applique quand
-- même les masques de données de l'athlète.
create or replace function public.community_shared_activity_detail(p_activity uuid, p_channel uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  owner uuid; me uuid := auth.uid(); shared boolean;
  ghide text[]; ahide text[]; hide text[]; base jsonb;
begin
  if me is null then return jsonb_build_object('can_view', false); end if;
  if not public.community_is_member(public.community_channel_space(p_channel)) then
    return jsonb_build_object('can_view', false);
  end if;

  select exists(
    select 1 from public.community_messages m
    where m.channel_id = p_channel
      and m.attachments @> jsonb_build_array(
        jsonb_build_object('type', 'activity', 'activity', jsonb_build_object('id', p_activity::text))
      )
  ) into shared;
  if not shared then return jsonb_build_object('can_view', false); end if;

  select user_id, hidden_data into owner, ahide from public.activities where id = p_activity;
  if owner is null then return jsonb_build_object('can_view', false); end if;
  select coalesce(activity_hidden_data, '{}') into ghide from public.profiles where id = owner;

  base := (
    select jsonb_build_object(
      'can_view', true,
      'zones', coalesce((select jsonb_agg(to_jsonb(z)) from public.training_zones z where z.user_id = owner and z.is_current), '[]'::jsonb)
    ) || (to_jsonb(a) - 'raw_data')
    from public.activities a where a.id = p_activity
  );

  if me is distinct from owner then
    hide := coalesce(ahide, ghide, '{}');
    base := public._apply_activity_masks(base, hide);
  end if;
  return base;
end $$;

grant execute on function public.community_shared_activity_detail(uuid, uuid) to authenticated;
