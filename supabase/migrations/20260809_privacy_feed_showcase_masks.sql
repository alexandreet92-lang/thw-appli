-- ══════════════════════════════════════════════════════════════════════════
-- ④ Confidentialité « partout » : le fil d'activités (activity_feed) et la
-- vitrine de profil (profile_activity_showcase) respectent désormais l'override
-- de visibilité par activité et masquent les données cachées (allure / watts).
-- ══════════════════════════════════════════════════════════════════════════

create or replace function public.activity_feed(max_rows integer default 40, before_ts timestamptz default null)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare me uuid := auth.uid();
begin
  if me is null then return '[]'::jsonb; end if;
  return coalesce((
    select jsonb_agg(row_to_json(x))
    from (
      select a.id,
             a.user_id as author_id,
             coalesce(nullif(p.full_name, ''), nullif(p.first_name, ''), 'Athlète') as author_name,
             p.avatar_url as author_avatar,
             a.sport_type as sport,
             coalesce(nullif(a.title, ''), a.race_name, 'Activité') as title,
             a.started_at,
             a.distance_m,
             coalesce(a.moving_time_s, a.elapsed_time_s) as seconds,
             case when 'pace'  = any(coalesce(a.hidden_data, p.activity_hidden_data, '{}')) then null else a.avg_pace_s_km end as avg_pace_s_km,
             case when 'watts' = any(coalesce(a.hidden_data, p.activity_hidden_data, '{}')) then null else a.avg_watts     end as avg_watts,
             a.elevation_gain_m,
             a.summary_polyline as polyline,
             a.sm_score as sm,
             a.sn_score as sn,
             a.is_race
      from public.follows f
      join public.activities a on a.user_id = f.following_id
      join public.profiles p on p.id = a.user_id
      where f.follower_id = me
        and coalesce(a.visibility, p.activity_visibility, 'public') <> 'private'
        and (before_ts is null or a.started_at < before_ts)
      order by a.started_at desc
      limit greatest(1, least(max_rows, 100))
    ) x
  ), '[]'::jsonb);
end; $function$;

create or replace function public.profile_activity_showcase(target uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  me uuid := auth.uid();
  vis text; can boolean; ghide text[]; is_self boolean;
  yr_start timestamptz := date_trunc('year', now());
  win_start timestamptz := now() - interval '371 days';
begin
  select coalesce(activity_visibility, 'public'), coalesce(activity_hidden_data, '{}')
    into vis, ghide from public.profiles where id = target;
  if vis is null then vis := 'public'; end if;
  is_self := (me = target);
  if is_self then can := true;
  elsif vis = 'public' then can := true;
  elsif vis = 'followers' then can := (me is not null) and exists(select 1 from public.follows where follower_id = me and following_id = target);
  else can := false; end if;
  if not can then return jsonb_build_object('can_view', false, 'visibility', vis); end if;
  return jsonb_build_object(
    'can_view', true, 'visibility', vis,
    'ytd_count', (select count(*) from public.activities where user_id = target and started_at >= yr_start),
    'hours_by_sport', (
      select coalesce(jsonb_agg(jsonb_build_object('sport', s, 'seconds', secs) order by secs desc), '[]'::jsonb)
      from (select sport_type as s, sum(coalesce(moving_time_s, elapsed_time_s, 0)) as secs from public.activities
            where user_id = target and started_at >= yr_start group by sport_type having sum(coalesce(moving_time_s, elapsed_time_s, 0)) > 0) t),
    'weekly', (
      select coalesce(jsonb_agg(jsonb_build_object('week', wk, 'count', c, 'distance_m', dist, 'seconds', secs) order by wk), '[]'::jsonb)
      from (select date_trunc('week', started_at)::date as wk, count(*) c, sum(coalesce(distance_m, 0)) dist, sum(coalesce(moving_time_s, elapsed_time_s, 0)) secs
            from public.activities where user_id = target and started_at >= win_start group by 1) w),
    'daily', (
      select coalesce(jsonb_agg(jsonb_build_object('d', d, 'count', c, 'seconds', secs) order by d), '[]'::jsonb)
      from (select started_at::date as d, count(*) c, sum(coalesce(moving_time_s, elapsed_time_s, 0)) secs
            from public.activities where user_id = target and started_at >= win_start group by 1) dd),
    'recent', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', id, 'sport', sport_type, 'title', coalesce(nullif(title, ''), race_name, 'Activité'),
        'started_at', started_at, 'distance_m', distance_m, 'seconds', coalesce(moving_time_s, elapsed_time_s),
        'avg_pace_s_km', case when not is_self and 'pace'  = any(coalesce(hidden_data, ghide, '{}')) then null else avg_pace_s_km end,
        'avg_watts',     case when not is_self and 'watts' = any(coalesce(hidden_data, ghide, '{}')) then null else avg_watts     end,
        'elevation_gain_m', elevation_gain_m,
        'polyline', summary_polyline, 'sm', sm_score, 'sn', sn_score, 'is_race', is_race
      ) order by started_at desc), '[]'::jsonb)
      from (select * from public.activities
            where user_id = target and (is_self or coalesce(visibility, vis, 'public') <> 'private')
            order by started_at desc limit 30) a),
    'records', (
      select coalesce(jsonb_agg(jsonb_build_object('sport', sport, 'label', distance_label, 'perf', performance, 'unit', performance_unit, 'at', achieved_at)), '[]'::jsonb)
      from public.personal_records where user_id = target and performance is not null and performance <> '')
  );
end; $function$;
