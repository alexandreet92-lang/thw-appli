-- Fix "Database error saving new user" au signup (erreur générique côté app :
-- « Une erreur est survenue. Réessaie dans quelques instants. »).
--
-- Cause : les triggers AFTER INSERT sur auth.users `on_auth_user_created_notif`
-- et `on_auth_user_created_wallet` exécutent des fonctions SECURITY DEFINER
-- SANS search_path figé et référençant leurs tables sans schéma. Exécutées par
-- le service auth (GoTrue), dont le search_path n'inclut pas `public`, les
-- tables ne se résolvent pas (SQLSTATE 42P01 « relation does not exist »), ce
-- qui annule l'INSERT auth.users et fait échouer tout le signup.
--
-- Correctif : figer `search_path` à 'public' et qualifier les noms de tables,
-- à l'identique de la fonction handle_new_user qui, elle, fonctionnait déjà.

CREATE OR REPLACE FUNCTION public.create_user_notif_prefs()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.user_notification_preferences (user_id, preferences)
  VALUES (NEW.id, '{}'::jsonb)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.create_user_wallet()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.user_token_wallet (user_id, plan_reset_date)
  VALUES (NEW.id, NOW())
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$function$;
