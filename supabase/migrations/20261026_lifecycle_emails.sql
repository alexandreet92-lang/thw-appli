-- E-mails de cycle de vie (série de bienvenue) : uniquement pour les comptes ayant coché
-- l'accord marketing à l'inscription (user_metadata.marketing_optin_at) et confirmé leur e-mail.
create table if not exists public.lifecycle_sends (
  user_id uuid not null,
  step text not null,
  sent_at timestamptz not null default now(),
  primary key (user_id, step)
);
create table if not exists public.lifecycle_optout (
  user_id uuid primary key,
  created_at timestamptz not null default now()
);
alter table public.lifecycle_sends enable row level security;
alter table public.lifecycle_optout enable row level security;

create or replace function public.lifecycle_candidates()
returns table (user_id uuid, email text, first_name text, lang text, created_at timestamptz, sent_steps text[])
language sql security definer set search_path = public, auth as $$
  select u.id, u.email::text,
         coalesce(nullif(p.preferred_name, ''), split_part(coalesce(p.full_name, ''), ' ', 1)),
         coalesce(u.raw_user_meta_data->>'lang', 'fr'),
         u.created_at,
         coalesce((select array_agg(s.step) from public.lifecycle_sends s where s.user_id = u.id), '{}')
  from auth.users u
  left join public.profiles p on p.id = u.id
  where u.email_confirmed_at is not null
    and u.raw_user_meta_data ? 'marketing_optin_at'
    and u.created_at > now() - interval '30 days'
    and not exists (select 1 from public.lifecycle_optout o where o.user_id = u.id);
$$;
revoke all on function public.lifecycle_candidates() from public, anon, authenticated;
grant execute on function public.lifecycle_candidates() to service_role;
