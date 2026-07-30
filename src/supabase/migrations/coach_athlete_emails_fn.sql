-- ══════════════════════════════════════════════════════════════
-- COACH — emails des athlètes liés (consentement requis).
-- L'email vit dans auth.users (inaccessible côté client). Cette fonction
-- SECURITY DEFINER n'expose QUE les emails des athlètes ayant un lien
-- coach_athlete ACCEPTÉ avec le coach appelant (auth.uid()).
-- ══════════════════════════════════════════════════════════════

create or replace function public.my_athlete_emails()
returns table(athlete_id uuid, email text)
language sql
security definer
stable
set search_path = public
as $$
  select ca.athlete_id, u.email::text
  from public.coach_athlete ca
  join auth.users u on u.id = ca.athlete_id
  where ca.coach_id = auth.uid()
    and ca.status = 'accepted'
$$;

revoke all on function public.my_athlete_emails() from public, anon;
grant execute on function public.my_athlete_emails() to authenticated;
