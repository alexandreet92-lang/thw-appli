# PROMPT_TEMP_STREAM — Stream température Strava

## Cause du problème
`temp` absent de STREAM_KEYS dans strava.ts → jamais fetchée → streams.temp toujours null
→ courbe Température toujours vide malgré le code SVG correct.

## Fichiers modifiés
- src/lib/sync/strava.ts
  - STREAM_KEYS : ajout de `temp`
  - fetchStreams() : mapping `data.temp → streams.temp`
  - nouvelle fonction exportée `syncTempBackfill(userId)` : re-fetche
    les streams des activités existantes qui ont déjà streams (!= null)
    pour y injecter temp — limité aux 2 dernières années, 200ms entre chaque

- src/app/api/sync/[provider]/route.ts
  - ajout paramètre `?temp=true` pour strava → appelle syncTempBackfill

## Utilisation du backfill
POST /api/sync/strava?temp=true
→ Parcourt toutes les activités Strava des 2 dernières années avec streams != null
→ Refetch les streams (inclut maintenant temp) et met à jour chaque row
→ Répond { synced: N }

## Pattern
Même logique que syncMissingStreams mais pour des activités
qui ONT déjà des streams (refetch pour ajouter le champ manquant).
