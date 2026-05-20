# Polar — Synchroniser les données disponibles

## Contexte
L'app Polar AccessLink n'a accès qu'à 3 types de données :
- Exercise data
- Daily activity data
- Physical information data

L'endpoint /sleep retourne 404 car pas autorisé.
NE PLUS appeler l'endpoint sleep. Supprimer les appels sleep
de la route sync.

## 1. Physical information (FC repos, poids, taille)
Endpoint : GET /v3/users/55919021/physical-information
Headers : Authorization: Bearer {token}

Cet endpoint retourne directement les données (pas de transaction).
Données attendues : weight, height, heart-rate (FC repos),
birthday, gender.

Stocker :
- FC repos → table daily_metrics (resting_hr, date=today, source='polar')
- Poids → mettre à jour le profil utilisateur (même table que
  la page Nutrition/Profil utilise pour le poids)

Afficher la FC repos sur la page Récupération dans la carte
"FC repos" qui est actuellement vide.

## 2. Daily activity data
Flux par transaction :
a) GET /v3/users/55919021/daily-activity
   → retourne resource-uri si nouvelles données disponibles (200)
   → 204 si rien de nouveau
b) GET {resource-uri} → liste les jours
c) GET {resource-uri}/{id} → détail du jour
d) PUT {resource-uri} → commit

Données : calories, steps, active_time, active_calories,
activity_goal.

Stocker dans health_data (data_type='daily_activity') :
- steps, calories, active_time_minutes, date, source='polar'

## 3. Exercise data (activités sportives)
Flux par transaction :
a) POST /v3/users/55919021/exercise-transactions → transaction-id
b) GET  /v3/users/55919021/exercise-transactions/{id} → liste exercices
c) GET  {exercise-url} → détail (sport, duration, distance,
   heart_rate avg/max, calories, training_load)
d) PUT  /v3/users/55919021/exercise-transactions/{id} → commit

Stocker dans activities (même table que Strava).
Duplicate check : si activité existante même date ±5min, skip.
source='polar', inclure training_load si disponible.

## 4. Route sync mise à jour
Dans /api/sync/polar :
- Supprimer syncPolarSleep
- Ordre : physical → daily-activity → exercises
- Retourner JSON :
  { physical: { status, resting_hr, weight },
    daily_activity: { status, days_synced },
    exercises: { status, exercises_synced } }

## 5. Affichage page Récupération — FC repos
PhysioSection lit déjà health_data(data_type='physical').
Avec syncPolarPhysical qui écrit maintenant en base, la carte
FC repos s'affichera automatiquement.

Aussi mettre à jour metrics_daily.resting_hr et profiles.weight_kg.

## 6. Affichage page Récupération — Pas quotidiens
Nouveau composant DailyStepsCard :
- Lit health_data(data_type='daily_activity') la dernière entrée
- Affiche : "X pas aujourd'hui" + barre vs objectif (10 000 pas)
- Position : bas de la page récupération, après PhysioSection

## 7. Live test mis à jour
GET /api/sync/polar?live=1 : tester uniquement les 3 endpoints
autorisés (physical-information, daily-activity, exercise-transactions).

## Correction appliquée
- syncPolarSleep supprimée
- syncPolarPhysical : écrit dans health_data + profiles + metrics_daily
- syncPolarDailyActivity : nouveau, flux transactionnel GET
- syncPolarActivities : duplicate check cross-provider
- Route : physical + daily + exercises, pas de sleep
- DailyStepsCard : nouveau composant Recovery
