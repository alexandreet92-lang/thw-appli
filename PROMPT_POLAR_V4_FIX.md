# Polar V4 — Fix sync sommeil + nightly recharge

## npm run build DOIT passer AVANT tout commit

## 1. Le sommeil retourne 200 avec 4 nuits
L'endpoint /sleeps fonctionne et retourne des données.
Vérifier que le vrai sync (POST, pas live) :
a) Parse correctement le champ nightSleeps du JSON
b) INSERT chaque nuit dans sleep_data avec TOUS les champs 
   retournés par Polar (pas juste sleepDate — il y a aussi 
   duration, phases, score etc. dans la réponse complète)
c) Logger le nombre de nuits insérées
d) UPSERT (ON CONFLICT user_id, date, source) pour éviter doublons

## 2. Nightly Recharge — fix erreur 28 jours max
L'endpoint retourne :
"The difference between 'from' and 'to' must not exceed 28 days"

Corriger : limiter la plage de dates à 28 jours maximum.
Si on veut 90 jours de données, faire des appels par tranches 
de 28 jours :
- Tranche 1 : from=today-28, to=today
- Tranche 2 : from=today-56, to=today-28
- Tranche 3 : from=today-84, to=today-56

Merger les résultats et insérer en base.

## 3. Scopes manquants
Le token actuel n'a que sleep:read et nightly_recharge:read.
Il manque daily_activity:read, exercise:read, physical_information:read.

Ces données viennent déjà de Strava, donc pas bloquant.
Mais mettre à jour la route OAuth pour demander TOUS les scopes 
lors de la prochaine connexion :
scope=sleep:read%20nightly_recharge:read%20daily_activity:read%20exercise:read%20physical_information:read

## 4. Affichage page Récupération
Après que les données sont en base, vérifier que :
- La section Sommeil lit depuis sleep_data WHERE source='polar'
- L'hypnogramme s'active quand des données existent
- Les graphiques HRV lisent depuis daily_metrics WHERE source='polar'
- Les cartes affichent les vraies valeurs

## 5. Appliquer aussi la limite 28 jours au live test
Le live test doit aussi utiliser max 28 jours pour nightly-recharge
pour ne plus avoir l'erreur 400.
