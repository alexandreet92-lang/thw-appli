# Polar — Migration API v3 → v4 (Dynamic API)

## ⚠️ npm run build DOIT passer AVANT tout commit

## Contexte
L'API v3 (Open AccessLink) ne donne pas accès aux données de
sommeil. L'API v4 (Dynamic API) inclut nativement sleep,
nightly recharge, HRV. Mêmes credentials (client_id/secret).

Documentation v4 : https://www.polar.com/polar-api-v4/

---

## 1. Modifier le flux OAuth

### Route autorisation (/api/auth/polar)
AVANT (v3) :
https://flow.polar.com/oauth2/authorization?response_type=code&client_id={ID}&redirect_uri={URI}&scope=accesslink.read_all

APRÈS (v4) :
https://auth.polar.com/oauth/authorize?response_type=code&client_id={ID}&redirect_uri={URI}&scope=openid%20email%20profile%20nightly_recharge:read%20sleep:read%20daily_activity:read%20exercise:read%20physical_information:read

Scopes v4 demandés :
- nightly_recharge:read (HRV, ANS charge, breathing rate)
- sleep:read (sommeil détaillé, phases, score)
- daily_activity:read (pas, calories)
- exercise:read (activités)
- physical_information:read (poids, taille, FC repos)

### Route callback (/api/auth/polar/callback)
AVANT (v3) :
POST https://polarremote.com/v2/oauth2/token

APRÈS (v4) :
POST https://auth.polar.com/oauth/token
Content-Type: application/x-www-form-urlencoded
Authorization: Basic base64(client_id:client_secret)
Body: grant_type=authorization_code&code={code}&redirect_uri={URI}

La réponse v4 contient : access_token, refresh_token,
token_type, expires_in, id_token

IMPORTANT : la v4 a un refresh_token. Le stocker en base.
Quand le access_token expire, utiliser le refresh_token :
POST https://auth.polar.com/oauth/token
Body: grant_type=refresh_token&refresh_token={refresh_token}

### Pas besoin d'enregistrer l'utilisateur
La v4 n'a PAS l'étape POST /v3/users pour enregistrer.
Supprimer cette étape si elle existe.

---

## 2. Modifier les endpoints de sync

### Base URL v4
https://www.polaraccesslink.com/v4/data

### Sommeil (NOUVEAU)
GET https://www.polaraccesslink.com/v4/data/sleeps?from=2026-04-20&to=2026-05-20
Authorization: Bearer {token}

Retourne une liste de nuits avec :
- date, sleep_start_time, sleep_end_time
- total_sleep_duration, light_sleep_duration,
  deep_sleep_duration, rem_sleep_duration
- interruption_duration, sleep_score
- sleep_cycles

Stocker chaque nuit dans sleep_data :
user_id, date, duration_minutes, light_sleep_minutes,
deep_sleep_minutes, rem_sleep_minutes, interruptions_minutes,
sleep_cycles, sleep_score, time_bed, time_wake, source='polar'

### Nightly Recharge (NOUVEAU)
GET https://www.polaraccesslink.com/v4/data/nightly-recharge-results?from=2026-04-20&to=2026-05-20
Authorization: Bearer {token}

Retourne : HRV (hrv_mssd), ANS charge, breathing rate.
Stocker dans daily_metrics :
user_id, date, hrv_ms, ans_charge, breathing_rate, source='polar'

### Daily Activity
GET https://www.polaraccesslink.com/v4/data/daily-activity?from=2026-05-13&to=2026-05-20
Authorization: Bearer {token}

Pas de transaction dans v4 — requête directe avec plage de dates.
Stocker dans health_data.

### Exercises
GET https://www.polaraccesslink.com/v4/data/exercises?from=2026-04-20&to=2026-05-20
Authorization: Bearer {token}

Requête directe avec plage de dates, pas de transaction.

### Physical Information
GET https://www.polaraccesslink.com/v4/data/physical-information
Authorization: Bearer {token}

---

## 3. Mettre à jour lib/polar.ts

Supprimer tout le code de transaction (v3).
Remplacer par des appels directs avec plages de dates (v4).

function callPolarV4(endpoint: string, token: string, params?: Record<string, string>) {
  const url = new URL(`https://www.polaraccesslink.com/v4/data/${endpoint}`)
  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
  }
  return fetch(url.toString(), {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json',
    },
  })
}

## 4. Mettre à jour la route sync

/api/sync/polar doit maintenant :

a) Récupérer token depuis Supabase
b) Si token expiré : refresh avec refresh_token
c) Calculer la plage de dates : from = 90 jours avant, to = aujourd'hui
d) Appeler TOUS les endpoints v4 en parallèle :
   - sleeps
   - nightly-recharge-results
   - daily-activity
   - exercises
   - physical-information
e) Insérer les données en base (UPSERT pour éviter les doublons)
f) Retourner le résumé

## 5. Re-connexion obligatoire
Après déploiement, l'utilisateur DOIT se re-connecter à Polar
car le token v3 ne fonctionne pas avec l'auth v4.

Sur la page Connexions :
- Le bouton Polar doit afficher "Reconnecter" si un ancien
  token v3 existe
- Au clic : relance le flux OAuth avec les nouvelles URLs v4
- Après reconnexion : déclencher un sync automatique

## 6. Live test
Mettre à jour /api/sync/polar?live=1 pour tester les endpoints v4.
Retourner le status + nombre de records pour chaque endpoint.

## 7. Vérification
1. npm run build → sans erreur
2. Déployer
3. Se reconnecter à Polar (nouveau OAuth v4)
4. Tester le live test
5. Tester le vrai sync
6. Vérifier que sleep_data contient des nuits
7. Vérifier que daily_metrics contient HRV
