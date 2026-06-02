# Fix laps (tours) — cyclisme

## Diagnostic
- Le graphe des tours bike = `LapsBikeChart` (`src/components/activity/LapsBikeChart.tsx`),
  rendu dans `activities/page.tsx` (`isBike`) avec `activityId={a.id}`, `cachedLaps={a.laps}`.
- Si `a.laps` est vide → fetch à la demande `/api/strava/activity-laps?activity_id=` (route
  existante, qui cache dans `activities.laps`). Le message « Impossible de charger les tours »
  est **affiché en dur** dès qu'un `error` est renvoyé → il masque la vraie cause.
- `getValidToken` + la route sont corrects. La cause réelle de l'échec est probablement
  un retour d'erreur Strava (scope, 429 rate-limit, ou laps indisponible sur `/laps`).

## Correctifs
### Route `/api/strava/activity-laps`
- **Diagnostics** : `console.error` de la vraie cause (token absent, status Strava…).
- **Fallback** : si `/activities/{id}/laps` échoue (≠404), réessayer l'endpoint détaillé
  `GET /activities/{id}` (qui contient aussi `laps`). Double chance de récupérer les tours.
- **429** propagé proprement.
- Cache dans `activities.laps` conservé.

### `LapsBikeChart`
- Reçoit désormais `streams` → **Watts max** par tour = `MAX(watts[start_index..end_index])`
  (calculé depuis le stream, pas inventé).
- Panneau détail enrichi (ÉTAPE 4) : Distance, Durée, Watts moy., **Watts max**, FC moy.,
  **FC max** (`lap.max_heartrate`), RPM moy., D+, Vitesse moy. Donnée absente → « — ».
- **Plus de « Impossible de charger les tours »** : erreur ou 0/1 tour → « Aucun tour
  enregistré » (la vraie erreur est loggée en console).
- Log diagnostic ÉTAPE 1 au chargement.

### `activities/page.tsx`
- Passe `streams={a.streams}` à `LapsBikeChart`.

## Choix
La récupération **à la demande + cache** (ÉTAPE 3, déjà en place) est conservée plutôt
qu'un fetch laps dans la sync en masse (`strava.ts`) : éviter +1 appel API par activité
(risque de rate-limit). La route lazy stocke les laps au 1er affichage.

npm run build doit passer.
