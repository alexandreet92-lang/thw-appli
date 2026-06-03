# Diagnostic page activité cyclisme — investigation, AUCUNE modification

Objectif : ne rien modifier. Rapport précis sur 2 bugs.

## Bug 1 — Blocs colorés sur la courbe de puissance
Localiser fichier + lignes + code exact qui dessine des rectangles/zones colorées
superposés sur la courbe de puissance, + le nom de la variable/composant.

## Bug 2 — Records de puissance non affichés
- **2a Stockage** : table Supabase des records, schéma exact, SELECT réel.
- **2b Backfill** : existe-t-il ? fichier + nom + a-t-il tourné ? nb de lignes.
- **2c Détection « record battu »** : fichier + lignes + code de comparaison,
  gestion du cas record stocké null.
- **2d Affichage** : fichier + lignes + JSX qui affiche « records battus » sous la
  carte, source des données (props/hook/query).

Format : rapport structuré (BUG 1 / BUG 2a-2d). Aucune correction.

═══════════════════════════════════════════════════════════════════
RAPPORT (aucune ligne de code applicatif modifiée)
═══════════════════════════════════════════════════════════════════

## BUG 1 — BLOCS COLORÉS
**Fichier :** `src/app/activities/page.tsx`
**Lignes :** rendu **2117-2125** ; source `computeBestWindows` **1660-1680** ; état `bestWindows` **1719-1723**.
**Variable/composant :** `bestWindows` (calculée par `computeBestWindows`), rendue dans le composant `SyncCharts`, uniquement sur le track `track.label === 'Puissance'`.

Code du rendu (2117-2125) :
```tsx
{/* Best effort windows (Puissance track only) */}
{track.label === 'Puissance' && bestWindows.map(win => {
  const wx1 = (win.startIdx / (N-1)) * 1000
  const wx2 = (win.endIdx   / (N-1)) * 1000
  return (
    <rect key={win.label} x={wx1} y={0} width={Math.max(1, wx2-wx1)} height={track.H}
      fill={win.color} />
  )
})}
```
Source des blocs + couleurs (1660-1680) :
```tsx
type BestWindow = { durationS: number; label: string; startIdx: number; endIdx: number; avgW: number; color: string }

function computeBestWindows(rawWatts: number[], N: number): BestWindow[] {
  const WINDOWS = [
    { durationS: 300,  label: "5'",  color: 'rgba(239,68,68,0.15)'  }, // rouge
    { durationS: 1200, label: "20'", color: 'rgba(249,115,22,0.15)' }, // orange
    { durationS: 3600, label: "1h",  color: 'rgba(6,182,212,0.15)'  }, // cyan
  ]
  return WINDOWS.filter(w => w.durationS <= N).map(w => {
    const len = w.durationS
    let sum = 0
    for (let i = 0; i < len && i < N; i++) sum += rawWatts[i]
    let bestAvg = sum / Math.min(len, N), bestStart = 0
    for (let i = len; i < N; i++) {
      sum += rawWatts[i] - rawWatts[i - len]
      const a = sum / len
      if (a > bestAvg) { bestAvg = a; bestStart = i - len + 1 }
    }
    return { ...w, startIdx: bestStart, endIdx: Math.min(N - 1, bestStart + len - 1), avgW: Math.round(bestAvg) }
  })
}
```
NB : ces rectangles (5'/20'/1h) sont sur le **graphe temporel puissance** (`SyncCharts`).
La courbe MMP dédiée (`PowerCurveChart`, ~l.763) n'a pas de blocs mais une courbe
rouge `recordCurve` + étoiles `recordStars` (l.822-849).

## BUG 2a — TABLE RECORDS
**Nom table :** `personal_records`
**Schéma (colonnes principales) :**
- `id` uuid NOT NULL, `user_id` uuid NOT NULL, `sport` text NOT NULL
- `distance_label` text NOT NULL (ex. `Pmax`, `30s`, `1min`, `5min`, `20min`, `1h`, `2h`…)
- `performance` text NOT NULL (watts en chaîne), `performance_unit` text
- `event_type` text (`training` | `competition` | `auto_session`)
- `achieved_at` date NOT NULL, `year` int, `activity_id` uuid
- autres : `distance_m`, `pace_s_km`, `race_name`, `race_location`, splits, `station_times` jsonb, `elevation_gain_m`, `notes`, `created_at`, `updated_at`, `rpe`, `surface`.

**SELECT résultat** (user `0436958c…`, sport bike — il existe bien des lignes) :
```
4h:185  1min:538  30s:698  3h:200  Pmax:1104  5min:351(competition)  30min:292  2h:240(competition)
```
→ 43 records au total, 32 en `bike`. Tous saisis manuellement (`event_type` = `training`/`competition`).

## BUG 2b — BACKFILL
**Existe :** OUI.
**Fichier :** `src/app/api/activities/backfill-records/route.ts` (logique partagée `src/lib/records/processBikeActivity.ts`).
**Exécuté :** NON (et il ne PEUT pas aboutir).
**Nb lignes auto dans la table :** `event_type='auto_session'` = **0**.
**Cause :** le backfill filtre `.eq('records_processed', false)` et écrit
`.update({ records_processed, records_beaten })` sur la table `activities` — or ces
colonnes **n'existent pas** (vérifié : 0 colonne `records_processed`/`records_beaten`
dans `activities`). La requête échoue donc avant tout insert → aucun record auto créé.

## BUG 2c — DÉTECTION RECORD BATTU
**Fichier :** `src/lib/records/processBikeActivity.ts`
**Lignes :** 136-176 (comparaison) ; calcul effort `computeMmp` l.56-68.
**Code de comparaison :**
```ts
const priorOnly = existing.filter(r => r.achieved_at < activityDate)

// null-safe : aucun record antérieur → bestAll/bestYear = 0
const bestAll:  Record<string, number> = {}
const bestYear: Record<string, number> = {}
for (const r of priorOnly) {
  const w = parseInt(r.performance) || 0
  if (w <= 0) continue
  if (w > (bestAll[r.distance_label] ?? 0)) bestAll[r.distance_label] = w
  if (r.achieved_at.slice(0, 4) === activityYear && w > (bestYear[r.distance_label] ?? 0)) {
    bestYear[r.distance_label] = w
  }
}
...
for (const { d, label, display } of BIKE_RECORD_DURS) {
  if (d > watts.length) continue
  const sessionW = computeMmp(watts, d)
  if (sessionW <= 0) continue
  const prevAll  = bestAll[label]  ?? 0
  const prevYear = bestYear[label] ?? 0
  const beatsAll  = sessionW > prevAll
  const beatsYear = sessionW > prevYear && !beatsAll
  ...
}
```
**Gestion null :** OUI. Le record absent est ramené à `0` via `?? 0` (sur `bestAll[label]`
et `bestYear[label]`), donc une 1ʳᵉ performance (prev = 0) compte comme record battu.

⚠️ **MAIS la détection ne s'exécute jamais** : avant la comparaison, la fonction lit
l'activité avec `.select('user_id, sport_type, started_at, streams, raw_data, records_processed, records_beaten')`
(processBikeActivity.ts ~l.86-91). Comme `records_processed`/`records_beaten` n'existent
pas dans `activities`, ce **SELECT échoue** → `actRaw` est null → la fonction sort
immédiatement (`reason:'not_found'`, payload vide) sans jamais comparer ni insérer.

## BUG 2d — AFFICHAGE RECORDS
**Fichier :** `src/components/activity/RecordsBeaten.tsx` (composant `RecordsBeaten`).
**Monté dans :** `src/app/activities/page.tsx` l.4940 et l.5344 → `<RecordsBeaten activityId={a.id} isBike={isBike} />`.
**Source des données :** appel `POST /api/activities/process-records` avec `{ activity_id }`
(useEffect, l.21-41) → renvoie `{ allTime: [], year: [] }` (BeatenPayload). Cette route
appelle `processBikeActivityRecords` (cf. 2c) qui échoue au SELECT → payload vide.
**Code de rendu (extrait) :**
```tsx
const allTime = data?.allTime ?? []
const year    = data?.year    ?? []
const total   = allTime.length + year.length
if (total === 0) {
  return ( <div …>Aucun record battu cette séance</div> )
}
return (
  <div style={{ marginBottom: 18 }}>
    <div …><span>Records battus</span><span style={{ color:'#F59E0B' }}>★</span></div>
    <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
      {allTime.map((e) => ( <div …>{e.display} — {e.watts} W <span>All Time</span></div> ))}
      {year.map((e) => ( <div …>{e.display} — {e.watts} W <span>Record {e.year}</span></div> ))}
    </div>
  </div>
)
```

## CAUSE RACINE COMMUNE (Bug 2)
La migration ajoutant `activities.records_processed` + `activities.records_beaten`
n'a jamais été appliquée à la base. Toute la chaîne records de puissance
(détection + backfill + affichage via `process-records`) échoue au premier SELECT/UPDATE
qui référence ces colonnes → 0 record auto, affichage toujours « Aucun record battu ».
(La détection est par ailleurs correcte et null-safe ; seul le schéma manque.)
Aucune correction effectuée — diagnostic uniquement.
