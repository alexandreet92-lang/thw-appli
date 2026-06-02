# PROMPT_RECORDS_BACKFILL — Backfill records + null-safe + badge année

## Fichiers créés/modifiés
- src/lib/records/processBikeActivity.ts                            (NEW)
- src/app/api/activities/process-records/route.ts                   (REFACTOR → util)
- src/app/api/activities/backfill-records/route.ts                  (NEW)
- src/components/activity/RecordsBeaten.tsx                          (badge "Record {année}")
- src/app/performance/DatasTab.tsx                                   (bouton "Recalculer" + 45min)

## Analyse code
- Structure stockage Performance : table `personal_records`
  - 1 ligne par tentative ; le « meilleur » = MAX(performance) par
    `(distance_label, sport='bike', user)` filtré par année
  - Page Performance lit via `getEffectiveRec(dur)` qui prend le max,
    filtré par `recordYear` (calendaire 'All Time' | 'YYYY')
- `BIKE_DURS` (page Performance) : oubliait `45min` → ajouté pour rester
  aligné avec MMP_TABLE_LABELS (Pmax → 6h, 20 durées suivies pour les records)
- `/api/activities/process-records` créé au prompt précédent : déjà
  null-safe (`bestAll[label] ?? 0`) → on extrait sa logique dans une
  lib partagée pour la réutiliser au backfill

## FIX 1 — Backfill
Route `POST /api/activities/backfill-records` :
1. Auth utilisateur
2. SELECT activités `sport_type IN ('bike','cycling','cycle','velo')` du user,
   `records_processed = false` (sauf si `?force=true`), `streams NOT NULL`,
   ordonnées par `started_at ASC` (chronologique)
3. Pour chaque activité : appeler `processBikeActivityRecords(sb, user.id, id)`
4. Réponse JSON `{ processed, beatenAllTime, beatenYear }`

Ordre chronologique = garantit que le « record de l'époque » est correct :
chaque activité est comparée aux records antérieurs uniquement.

## FIX 2 — Détection null-safe
Déjà en place dans `processBikeActivityRecords` :
```ts
const prevAll  = bestAll[label]  ?? 0   // null → 0 → toute perf > 0 bat
const prevYear = bestYear[label] ?? 0
const beatsAll  = sessionW > prevAll
const beatsYear = activityYear === currentYear && sessionW > prevYear && !beatsAll
```
On compare aux records ANTÉRIEURS (inserts strictement supérieurs).
Une perf > record vide compte comme nouveau record (prevAll = 0 ⇒ tout sessionW > 0 bat).

## FIX 3 — Badge année concret
- Payload year ajoute `year: string` (année calendaire de l'activité)
- Badge affiche `Record {year}` au lieu de `Année`
  - Mobile / Desktop : même rendu

## FIX 4 — Cohérence Performance
- Inserts via `event_type='auto_session'`, achieved_at = date activité
- Page Performance calcule déjà le max → reflète automatiquement
- Ajouter `45min` à `BIKE_DURS` côté DatasTab pour montrer le record 45'

## Bouton « Recalculer » (DatasTab)
Dans la Card « Records de puissance » :
- header du Card → bouton discret en haut à droite
- POST `/api/activities/backfill-records`
- Pendant l'appel : texte « Calcul… » + désactivé
- À la fin : recharge `bikeAllRecords`

## Vérifications
- npm run build : 0 erreur TS
- Backfill → page Performance se remplit
- Null-safe : record vide → 1ère perf compte
- Badge année : « Record 2026 » (ou année activité)
- Pas de doublon (inserts strictement >)
- Idempotence : 2ᵉ run via `records_processed=true` ne fait rien
