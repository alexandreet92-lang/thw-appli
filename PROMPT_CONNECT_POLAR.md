# Connexions — Implémenter Polar uniquement

## ⚠️ Avant de coder
Inventaire de l'existant :

grep -r "polar" --include="*.ts" --include="*.tsx" -rl
grep -r "POLAR" .env*
ls -la app/api/auth/
grep -r "connections\|integrations\|oauth" --include="*.ts" -rl

Lister les résultats. Réutiliser tout code existant.

Les variables POLAR_CLIENT_ID et POLAR_CLIENT_SECRET sont 
configurées sur Vercel. Les référencer via process.env.

---

## OAuth2 Flow Polar

### Route autorisation : app/api/auth/polar/route.ts
Rediriger vers :
https://flow.polar.com/oauth2/authorization?response_type=code&client_id={POLAR_CLIENT_ID}&redirect_uri={APP_URL}/api/auth/polar/callback&scope=accesslink.read_all

### Route callback : app/api/auth/polar/callback/route.ts
1. Recevoir le paramètre `code`
2. Échanger contre access_token :
   POST https://polarremote.com/v2/oauth2/token
   Headers : Authorization Basic base64(client_id:client_secret)
   Body : grant_type=authorization_code, code={code}, 
          redirect_uri={APP_URL}/api/auth/polar/callback
   Content-Type: application/x-www-form-urlencoded

3. La réponse contient : access_token, token_type, x_user_id
4. Sauvegarder dans la même table que Strava 
   (trouver cette table d'abord) :
   user_id, provider='polar', access_token, 
   polar_user_id=x_user_id, created_at

5. Enregistrer l'utilisateur dans Polar AccessLink :
   POST https://www.polaraccesslink.com/v3/users
   Headers : Authorization Bearer {access_token}
   Content-Type: application/json
   (cette étape peut retourner 409 si déjà enregistré — ignorer)

6. Rediriger vers /connexions avec un toast de succès

### Bouton dans la page Connexions
Le bouton "+ Connecter" de Polar → lien vers /api/auth/polar
Au retour : la page doit relire la table de connexions et 
afficher Polar comme "Connecté".

---

## Synchro des données : app/api/sync/polar/route.ts

Route appelable manuellement (bouton Sync) ou automatiquement.

### Activités
GET https://www.polaraccesslink.com/v3/users/{polar_user_id}/exercise-transactions
Headers : Authorization Bearer {access_token}

Si transaction disponible :
1. GET la transaction pour lister les exercices
2. Pour chaque exercice : GET le détail
3. Stocker dans la table des activités (source='polar') :
   sport, duration, distance, avg_hr, max_hr, calories, date
4. Commit la transaction (PUT)

### Sommeil
GET https://www.polaraccesslink.com/v3/users/{polar_user_id}/sleep
Headers : Authorization Bearer {access_token}

Données retournées : date, duration, light_sleep, deep_sleep, 
rem_sleep, interruptions, sleep_cycles, sleep_score, 
time_bed, time_wake

Stocker dans table sleep_data (créer si nécessaire) :
CREATE TABLE IF NOT EXISTS sleep_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  date date NOT NULL,
  duration_minutes integer,
  light_sleep_minutes integer,
  deep_sleep_minutes integer,
  rem_sleep_minutes integer,
  interruptions_minutes integer,
  sleep_cycles integer,
  sleep_score integer,
  time_bed timestamptz,
  time_wake timestamptz,
  source text NOT NULL DEFAULT 'polar',
  raw_data jsonb,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, date, source)
);

### Données physiques
GET https://www.polaraccesslink.com/v3/users/{polar_user_id}/physical-information
→ FC repos, poids, taille
→ Stocker FC repos dans daily_metrics (créer si nécessaire) :

CREATE TABLE IF NOT EXISTS daily_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  date date NOT NULL,
  resting_hr integer,
  hrv_ms decimal,
  source text NOT NULL DEFAULT 'polar',
  raw_data jsonb,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, date, source)
);

RLS sur les deux tables : user_id = auth.uid()

---

## Alimenter la page Récupération

Une fois les données Polar en base :

1. Section Sommeil : lire depuis sleep_data WHERE source='polar'
   → Activer l'hypnogramme (variable hasDeviceSleepData = true 
   quand des données existent dans sleep_data pour cet utilisateur)
   → Afficher phases, durées, score

2. Carte FC Repos : lire depuis daily_metrics 
   → Afficher la valeur + trend

3. Score de récupération : intégrer le sleep_score Polar 
   dans le calcul si disponible (pondération à définir)

---

## Gestion d'erreurs
- Token expiré : Polar access tokens n'expirent pas (pas de refresh)
  mais vérifier le status 401 et demander reconnexion si nécessaire
- Pas de données : afficher "Aucune donnée Polar récente" 
  au lieu d'un crash
- API indisponible : catch + message d'erreur propre
