# PROMPT_RECORDS_SYSTEM — Records auto + badges + nettoyage MMP

## Fichiers créés/modifiés
- src/supabase/migrations/add_records_processed_to_activities.sql   (NEW)
- src/app/api/activities/process-records/route.ts                   (NEW)
- src/components/activity/RecordsBeaten.tsx                         (NEW)
- src/app/activities/page.tsx                                       (FIX 1 + intégration FIX 2)

## Analyse code
- `personal_records` table : 1 ligne par tentative ; le "meilleur" est le max
  des `performance` par `distance_label` (logique existante page Performance)
- Sur la page Activity, PowerCurveChart marquait les "key moments" (5', 20',
  30', 45', 1h) avec rectangles + lignes verticales sur la courbe MMP
  → à supprimer (FIX 1)
- `computeMmpCurve` existe déjà dans activities/page.tsx → on copie la même
  logique côté API (sliding-window cap 1500W)

## FIX 1 — Retirer les rectangles sur la courbe MMP
Dans `PowerCurveChart` :
- Supprimer le bloc `keyMoments` (rect + text + line + circle)
- Supprimer aussi `KEY_MOMENT_DURS` / `KEY_MOMENT_LBLS` du module si plus utilisés ailleurs
- La courbe MMP elle-même (bleue) et la record curve (rouge dashed) restent intactes

## FIX 2 — Section "Records battus" sous la carte

Composant `RecordsBeaten({ activityId, isBike })` qui :
1. Si `!isBike` → rend rien
2. Sur mount : `POST /api/activities/process-records` `{ activity_id }`
3. Affiche badges :
   - All Time : badge doré (`#B8860B` border + `#FBBF24` text + fond `rgba(245,158,11,0.10)`)
     Format : `5' — 351 W · Record All Time`
   - Année : badge cyan (`#06B6D4`)
     Format : `5' — 351 W · Record de l'année`
   - Si une durée est All Time, on ne la duplique pas en Année (All Time inclut Année)
4. Si aucun record battu : petite ligne discrète `Aucun record battu cette séance`

Placement :
- Mobile : juste après le titre + sous-titre dans le bottom-sheet
- Desktop : juste après le hero row (carte + stats), avant le bloc IA

## FIX 3 — Auto-update des records (POST `/api/activities/process-records`)

### Migration SQL
```sql
ALTER TABLE activities
  ADD COLUMN IF NOT EXISTS records_processed BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS records_beaten    JSONB   DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_activities_records_unprocessed
  ON activities (user_id) WHERE records_processed = FALSE;
```

### Logique route
1. Auth supabase. Charge activity : `id, user_id, sport_type, started_at, streams, raw_data, records_processed, records_beaten`
2. Si sport_type ≠ 'bike' → return empty
3. Si `records_processed && records_beaten` → return `records_beaten` (idempotent)
4. Récup watts : `streams.watts ?? raw_data?.streams?.watts`
5. Calcul session MMP (`computeMmpCurve`) pour chaque durée connue :
   ```ts
   const BIKE_RECORD_LABELS = [
     { d:1, label:'Pmax', display:'Pmax' }, { d:10, label:'10s', display:'10''' },
     { d:30, label:'30s', display:'30''' }, { d:60, label:'1min', display:'1''' },
     { d:180,label:'3min',display:'3''' }, { d:300, label:'5min', display:'5''' },
     { d:480, label:'8min',display:'8''' }, { d:600, label:'10min',display:'10''' },
     { d:720, label:'12min',display:'12''' }, { d:900, label:'15min',display:'15''' },
     { d:1200,label:'20min',display:'20''' }, { d:1800,label:'30min',display:'30''' },
     { d:2700,label:'45min',display:'45''' }, { d:3600,label:'1h',display:'1h' },
     { d:5400,label:'90min',display:'1h30' }, { d:7200,label:'2h',display:'2h' },
     { d:10800,label:'3h',display:'3h' }, { d:14400,label:'4h',display:'4h' },
     { d:18000,label:'5h',display:'5h' }, { d:21600,label:'6h',display:'6h' },
   ]
   ```
6. Charge les `personal_records` (sport=bike, distance_label IN labels) pour user
7. Pour chaque durée :
   - `prevAllTimeBest` = max performance pour ce distance_label
   - `prevYearBest` = max performance pour ce distance_label, année calendaire courante
   - session > 0 et session > prevAllTimeBest → flag allTime + insert
   - session > prevYearBest (et année courante) → flag year + insert si pas déjà inséré
8. Pour chaque durée beaten : INSERT
   ```ts
   {
     user_id, sport:'bike', distance_label,
     performance: String(sessionW), performance_unit:'watts',
     event_type:'auto_session',
     achieved_at: activity.started_at.slice(0,10),
     race_name:null, pace_s_km:null, elevation_gain_m:null,
     split_swim:null, split_bike:null, split_run:null,
     station_times:null, notes:null,
   }
   ```
9. Update `activities.records_processed=true, records_beaten=jsonb`
10. Return `{ allTime: [{label, watts}], year: [{label, watts}] }`

### Idempotence
- 2ᵉ ouverture de la même activité → API détecte `records_processed=true` et renvoie `records_beaten` stocké
- Aucune ré-insertion, aucun doublon

## Vérification
- npm run build : 0 erreur TS
- Plus de marqueurs sur la courbe MMP
- Bike + streams.watts → API processe et affiche badges
- Re-ouverture → idempotent (pas de doublon en DB)
- Page Performance reflète les nouveaux records automatiquement (lecture max sur personal_records)
