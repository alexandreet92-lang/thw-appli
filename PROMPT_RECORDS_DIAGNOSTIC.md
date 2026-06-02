# Diagnostic Records de puissance (MMP) — investigation, AUCUNE correction

Objectif : investiguer et rapporter, sans modifier le comportement.

## Q1 — Les blocs colorés sur la courbe MMP
Localiser le composant qui dessine la courbe de puissance (MMP) et le code
exact qui rend les rectangles/blocs colorés des meilleurs efforts par-dessus.
→ Fichier + lignes + extrait de code (sans suppression).

## Q2 — Où sont stockés les records
Trouver où la page Performance lit/stocke les records de puissance.
→ Table Supabase + colonnes, format réel (SELECT), séparation All Time / Année.

## Q3 — Le backfill a-t-il tourné
→ Existence de la route/fonction de backfill, a-t-elle écrit des records,
  combien d'activités `records_processed = true` vs `false`.

## Q4 — La détection "record battu"
Localiser le code qui calcule les meilleurs efforts d'une activité et les
compare aux records stockés (affichage sous la carte).
→ Fichier + code de comparaison + valeurs réelles loggées pour une activité test.

Rapport : 4 réponses, fichiers + code + logs réels. Aucune modification.

═══════════════════════════════════════════════════════════════════
RÉSULTATS DU DIAGNOSTIC (aucune ligne de code applicatif modifiée)
═══════════════════════════════════════════════════════════════════

## Q1 — Les blocs colorés sur la courbe
Composant de la courbe de puissance MMP : `PowerCurveChart`
(`src/app/activities/page.tsx`, à partir de la ligne **763**) — titre
« Courbe de puissance (MMP) » l.931. Il dessine la courbe de session + une
courbe rouge « record » + des étoiles (pas de blocs).

Les **blocs/rectangles colorés** (« meilleurs efforts ») ne sont PAS sur la
courbe MMP mais sur le **track « Puissance » du graphe temporel** (composant
`SyncCharts`). Source = `computeBestWindows` (l.**1662-1680**) :
```ts
function computeBestWindows(rawWatts: number[], N: number): BestWindow[] {
  const WINDOWS = [
    { durationS: 300,  label: "5'",  color: 'rgba(239,68,68,0.15)'  }, // rouge
    { durationS: 1200, label: "20'", color: 'rgba(249,115,22,0.15)' }, // orange
    { durationS: 3600, label: "1h",  color: 'rgba(6,182,212,0.15)'  }, // cyan
  ]
  return WINDOWS.filter(w => w.durationS <= N).map(w => { /* sliding-avg max */ })
}
```
Rendu des rectangles (l.**2117-2125**) :
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
`bestWindows` = `useMemo` l.1720-1723 (`computeBestWindows(s.watts, N)`).

## Q2 — Où sont stockés les records
Table Supabase **`personal_records`** (même source que la page Performance).
Colonnes utilisées : `user_id, sport, distance_label, performance (TEXT, watts
en string), performance_unit, event_type, achieved_at, notes`.
Exemple réel (SELECT) :
```
[diag] exemple record stocké:
  { sport:'bike', distance_label:'30s',  performance:'698', performance_unit:'watts',
    event_type:'training', achieved_at:'2026-05-27' }
  { sport:'bike', distance_label:'1min', performance:'538', event_type:'training', ... }
  { sport:'bike', distance_label:'4h',   performance:'185', event_type:'training', ... }
```
Séparation **All Time / Année** : PAS structurelle. Une seule table ; la
distinction est calculée à la lecture en filtrant `achieved_at >= 1er janvier
année courante` (UI : `PowerCurveChart`, l.804-815 → `yearBest` vs `allBest` ;
serveur : `processBikeActivityRecords`, l.139-148 → `bestAll` vs `bestYear`).
Le payload « battu » côté serveur est `{ allTime:[], year:[] }`.

## Q3 — Le backfill a-t-il tourné  →  NON (et ne peut pas, schéma manquant)
La route existe : `POST /api/activities/backfill-records`
(+ lib partagée `src/lib/records/processBikeActivity.ts`).
MAIS le diagnostic DB révèle un blocage de schéma :
```
[diag] backfill état:
  - activities : colonnes records_processed / records_beaten = ABSENTES
    (la table a power_curve/pace_curve jsonb, mais PAS records_processed/_beaten)
  - migration "add_records_processed_to_activities" : NON appliquée à thw-v2
    (schema_migrations ne contient aucune migration records_processed)
  - personal_records.event_type='auto_session' (signature du backfill) : 0 ligne
  - bike activities total : 443 | avec streams : 32 | avec watts : 14 | power_curve: 0
```
Conséquence : tout appel au backfill échoue dès le filtre
`.eq('records_processed', false)` → « column records_processed does not exist ».
Le backfill n'a donc **jamais inséré aucun record** (0 `auto_session`). On ne
peut pas compter true/false : la colonne n'existe pas.

## Q4 — La détection « record battu »
Deux mécanismes :
1) **UI live (celui qui s'affiche)** — `PowerCurveChart` :
   - efforts séance = `computeMmpCurve(watts, …)` (`mmp`, l.775)
   - records lus depuis `personal_records` → `allBest`/`yearBest` (l.798-815)
   - comparaison → étoiles `recordStars` (l.844-850) :
     `recordCurve[i] > 0 && mmp[i] >= recordCurve[i]`
     (NB : une durée SANS record stocké → recordCurve=0 → filtrée, pas d'étoile)
2) **Serveur (dormant)** — `processBikeActivityRecords` (`computeMmp` +
   `beatsAll = sessionW > prevAll`, prevAll=0 si aucun antérieur) ; écrit
   `records_beaten` — colonne absente → jamais exécuté. `records_beaten` n'est
   lu nulle part dans l'UI.

Logs réels pour l'activité test (id `630495ae…`, 2026-06-01, 6816 pts watts) :
```
[diag] efforts séance (MMP calculé):
  1s:629  5s:551  30s:520  1min:513  3min:345  5min:290  20min:231  1h:206  (W)
[diag] records comparés (allTime, personal_records, user 0436958c):
  Pmax:1104  5s:(aucun)  30s:698  1min:538  3min:386  5min:351  20min:297  1h:256
[diag] records détectés battus (UI recordStars):
  AUCUN — toutes les durées avec record stocké sont sous le record ;
  le 5s (551W) n'a pas de record stocké → recordCurve=0 → filtré (pas d'étoile).
  (Côté serveur dormant, le 5s aurait compté comme 1er effort, mais le code ne tourne pas.)
```

## Conclusion
La cause racine de l'absence de records auto : la migration ajoutant
`activities.records_processed` + `records_beaten` n'a jamais été appliquée sur
thw-v2 → le pipeline backfill/process est inopérant (0 record auto-détecté).
L'UI compare malgré tout en direct via `personal_records` (étoiles), mais seuls
les records SAISIS MANUELLEMENT (`event_type='training'`, 43 lignes) existent.
(Aucune correction effectuée — diagnostic uniquement.)
