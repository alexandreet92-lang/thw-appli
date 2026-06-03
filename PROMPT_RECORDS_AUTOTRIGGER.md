# PROMPT_RECORDS_AUTOTRIGGER — Déclenchement auto des records après import

## Fichiers créés/modifiés
- src/lib/records/triggerRecordsProcessing.ts                       (NEW)
- src/lib/sync/strava.ts                                            (2 appels)
- src/app/api/strava/webhook/route.ts                               (1 appel)
- src/lib/sync/polar.ts                                             (1 appel batch)
- src/lib/sync/wahoo.ts                                             (1 appel batch)
- src/supabase/migrations/add_records_processed_to_activities.sql   (DEFAULT '[]'::jsonb)

## Pipelines couverts
| Pipeline | Insert/upsert | Streams présents ? | Appel trigger |
|---|---|---|---|
| Strava webhook | `app/api/strava/webhook/route.ts:195` | ✅ (streams dans la row) | après upsert+select |
| Strava initial sync | `lib/sync/strava.ts:216` (batch) puis `:242` (streams update) | ✅ (après update streams) | dans la boucle stream-update |
| Strava syncMissingStreams | `lib/sync/strava.ts:284` (streams update) | ✅ | dans la boucle stream-update |
| Polar | `lib/sync/polar.ts:365` | ❌ (Polar v4 sans watts/seconde) | après upsert (no-op → marqué processed=true via no_watts) |
| Wahoo | `lib/sync/wahoo.ts:69` | ❌ (Wahoo: avg_watts seulement) | après upsert (no-op) |

## Pipelines volontairement NON triggés
- **import-history** (`app/api/strava/import-history/route.ts`) : route proxy GET sans insert. L'insert se fait côté client (`DatasTab.tsx:4402`) sans les streams. Lancer le trigger ici marquerait l'activité `records_processed=true` avec un payload vide *avant* l'arrivée des streams → les records ne seraient jamais calculés. Les streams sont récupérés ensuite par `syncMissingStreams` qui contient déjà le trigger.
- **upload-activity** (`app/api/strava/upload-activity/route.ts`) : upload GPX vers Strava ; l'activité revient ensuite via le webhook qui déclenche.
- **Record screens** (`components/record/*Screen.tsx`) : enregistrements live sans `streams.watts` stockés — rien à calculer.
- **route sync/[provider]** : délègue aux libs déjà instrumentées.
- **syncTempBackfill** : update streams sur activités existantes ; couvertes par les autres triggers (ou Backfill manuel si non encore traitées).

## Helper centralisé
`src/lib/records/triggerRecordsProcessing.ts` :
- Signature : `{ activityId, userId, sport }`
- `if (sport !== 'bike') return` (fast-path)
- Crée un `createServiceClient()` puis appelle `processBikeActivityRecords(sb, userId, activityId)`
- Try/catch englobant : log `[records-trigger]` au début, `console.error` en cas d'échec, ne propage JAMAIS
- Retourne `void` — non bloquant logiquement (à appeler avec `await` mais l'erreur est absorbée)

## Pattern batch (Polar / Wahoo / sync Strava)
Après le upsert/update, on chaîne `.select('id, sport_type, provider_id')`,
puis boucle `for…of` séquentielle pour ne pas saturer (200 activités max
par batch dans Strava → 200 appels lib séquentiels, lib utilise service
client donc pas de contention RLS).

## Migration repo ↔ DB
Resync de `add_records_processed_to_activities.sql` :
```sql
ALTER TABLE activities
  ADD COLUMN IF NOT EXISTS records_processed boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS records_beaten    jsonb   DEFAULT '[]'::jsonb;
```
Match la prod (vérifié via `information_schema.columns`).

## Vérification
- npm run build : 0 erreur TS
- Logs `[records-trigger] processing activity <id> for user <user>` + `done` après chaque import
- Après une activité bike avec watts importée par webhook : `records_processed=true` immédiatement
- Page Performance reflète les records dans la foulée (re-fetch on mount du composant DatasTab)
