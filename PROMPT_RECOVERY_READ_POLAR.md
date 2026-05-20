# Récupération — Lire les données Polar stockées

## Problème
La synchro Polar fonctionne et insère des données dans :
- health_data (data_type='physical') — colonnes hr_resting + raw_data.resting_hr
- metrics_daily (resting_hr)
- profiles (weight_kg)
- body_weight (historique poids)
- health_data (data_type='daily_activity') — steps, active_calories, raw_data.active_time_s

Mais la page Récupération ne lit PAS ces tables.
Les cartes FC repos, les graphiques etc. restent vides.

## Corrections

### 1. PhysioSection — FC repos
Lire depuis DEUX sources (fallback) :
a) health_data WHERE data_type='physical' — sélectionner hr_resting ET raw_data
   hr_resting = colonne directe (nouveau)
   raw_data.resting_hr = fallback si hr_resting null
b) metrics_daily ORDER BY date DESC LIMIT 30
   resting_hr = colonne directe

Fusionner les deux sources, dédupliquer par date, prendre le plus récent.

Ajouter console.log pour debug :
  console.log('[PhysioSection] health_data physical:', data)
  console.log('[PhysioSection] metrics_daily:', metricsData)

### 2. DailyStepsCard — Pas quotidiens
Lire depuis health_data WHERE data_type='daily_activity'.
Colonnes : steps, active_calories, total_calories, raw_data.active_time_s.

Ajouter console.log :
  console.log('[DailyStepsCard] health_data daily_activity:', rows)

### 3. Sync button
Le bouton Sync dans Connexions appelle POST /api/sync/{provider}.
Pour Polar, la route retourne maintenant un JSON structuré :
{ physical, daily_activity, exercises }
Afficher un toast plus détaillé après sync Polar.

### 4. Vérification des colonnes health_data
health_data a une colonne hr_resting (numeric nullable).
syncPolarPhysical écrit hr_resting=restingHr en colonne directe.
PhysioSection doit lire hr_resting en priorité sur raw_data.resting_hr.

## Résultat attendu
Après un sync Polar réussi :
- health_data(data_type='physical') contient hr_resting=52, date=today
- metrics_daily contient resting_hr=52, date=today
- PhysioSection lit la valeur et affiche "52 bpm"
- DailyStepsCard lit les pas et les affiche si disponibles
