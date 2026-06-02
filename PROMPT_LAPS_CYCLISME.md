# PROMPT_LAPS_CYCLISME — Graphique des laps cyclisme

## Fichiers créés/modifiés
- src/app/api/strava/activity-laps/route.ts  (NEW)
- src/components/activity/LapsBikeChart.tsx  (NEW)
- src/app/activities/page.tsx               (LapData + import + placement)

## Analyse codebase effectuée

### Laps dans la DB
- `activities.laps` colonne JSONB — jamais remplie par la sync Strava existante
- `LapData` interface définie dans page.tsx (lignes 123-136) — sans elevation_gain_m
- LapsChart/LapsTable existants utilisent `a.laps` → vide en pratique

### Pattern lazy-load existant
- Identique au pattern streams : `/api/strava/streams` → `fetchAndStoreStreams`
- `getValidToken(userId)` dans `src/lib/strava/tokens.ts` — refresh auto inclus
- `provider_id` = strava activity ID (string) dans table activities

### Emplacement PowerCurveChart
- Dans ActivityDetail (page.tsx ligne ~5622)
- Dans le bloc `{a.streams && (() => {...})}` (ligne 5612)
- Section "GRAPHIQUES D'ANALYSE AVANCÉE"

## Modifications LapData (page.tsx)
Ajouter `elevation_gain_m?: number | null` à l'interface existante.

## API Route /api/strava/activity-laps/route.ts
- GET ?activity_id=<uuid>
- Vérifie cache dans activities.laps → retourne si présent et length > 1
- Sinon fetch Strava /activities/{provider_id}/laps
- Mapping → LapData (avec elevation_gain_m = total_elevation_gain)
- Stockage dans activities.laps pour cache
- Return { laps }

## Composant LapsBikeChart
Props: activityId: string, cachedLaps?: LapData[] | null, avgWatts?: number | null
- Si cachedLaps fourni et length > 1 → utiliser directement (pas de fetch)
- Sinon : fetch depuis /api/strava/activity-laps au mount
- Si 1 seul lap ou 0 watts → return null
- useState: laps, loading, error, selectedLap

### SVG pur (pas de recharts)
viewBox dynamique : `0 0 ${PAD_L + N*SLOT_W + PAD_R} ${PAD_T + CH + PAD_B}`
PAD_L=44 (Y axis), PAD_R=8, PAD_T=8, PAD_B=24 (X labels), CH=150

Barre :
  x = PAD_L + i * SLOT_W + (SLOT_W - BAR_W) / 2
  barH = (lap.avg_watts / maxW) * CH
  y = PAD_T + CH - barH
  fill = selectedLap===i ? '#7C3AED' : '#A855F7'
  onClick → setSelectedLap(i)

Y axis : grilles horizontales + labels (50W intervals)
Ligne avg watts : dashed #475569
X labels : "T1"..."TN" en bas

### Panneau détail (inline, sous le graphique)
Background var(--bg-card), border 0.5px solid var(--border), borderRadius 12px,
padding 16px 20px, marginTop 16px
Grid 2 colonnes : Distance | Durée | Watts moy | FC moy | RPM moy | D+ | Vitesse moy
Bouton ✕ pour fermer

## Placement dans ActivityDetail
Dans le bloc `{a.streams && (() => {...})}`, après le bloc PowerCurveChart (ligne ~5628):
```
{isBike && (
  <LapsBikeChart activityId={a.id} cachedLaps={a.laps} avgWatts={a.avg_watts} />
)}
```

## Gestion des cas
- 0 laps ou 1 lap → return null (ne pas afficher)
- Tous watts=0/null → return null
- Erreur fetch → message discret "Impossible de charger les tours"
- Loading → spinner léger
- Token Strava expiré → géré par getValidToken (auto-refresh)
