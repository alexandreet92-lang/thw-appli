# PROMPT_TEMP_FIX — streams.temp disponible

## État de départ
ÉTAPE 1 (STREAM_KEYS) : déjà fait — 'temp' présent dans STREAM_KEYS
ÉTAPE 2 (mapping)     : déjà fait — `if (data.temp) streams.temp = data.temp.data`

## Problème ÉTAPE 3 (backfill)
`fetchAndStoreStreams` (streams.ts) retourne les streams cachés si
`Object.keys(activity.streams).length > 0`, même si velocity et temp
manquent. Résultat : "Le Four" et toutes les activités pré-fix restent
avec des streams incomplets sans jamais se re-fetcher.

## Correction
Modifier le cache-check pour re-fetcher si `velocity` est absent
(indicateur d'un stream ancien pré-fix). Le re-fetch récupère
automatiquement velocity ET temp depuis Strava.

Cache valide uniquement si `streams.velocity` est présent.
