# PROMPT_SELECTEUR_PANEL_REDESIGN — Refonte panel SelectionSheet

## Fichier modifié
- `src/app/activities/page.tsx` — `SelectionSheet` (l. 1771-2058) + caller dans `ActivityCurves`

## Composants donut
Aucun composant donut FC/Power réutilisable trouvé (planning a un `donutArcPath` inline mais non exporté). Création d'un `ZoneDonut` inline dans `activities/page.tsx` avec helpers `_polarXY` + `_donutArcPath`.

## Étape 1 — Header
- Titre : 20px / 700 (était 17px)
- Sous-titre : 13px tabular (était 11px)
- Padding 14 24 16 24 + border-bottom var(--border)

## Étape 2 — Stats 4 colonnes
Grille `repeat(4, 1fr)` (responsive `repeat(2, 1fr)` mobile via classe `.sel-stats-grid`).

Composant interne `StatBlock`:
- Label 11 / 500 / var(--text-dim) + margin-bottom 4
- Valeur **24 px / 700 / tabular-nums** / class `barlow`
- Si valeur === `—`, color var(--text-dim) au lieu de var(--text)
- Margin-bottom 16 entre stats

4 colonnes :
- **Effort** : Durée / Distance / Vitesse moy / Vitesse max
- **Puissance** : Watts moy / Watts max / Watts normalisés (NP) / W/kg (stub `—`)
- **Cadence** : Cadence moy / Cadence max / Roue libre
- **Terrain + Température** : D+ / D− / Alt max / Alt moy → puis sous-section Température (Temp moy/max/min)

Stats vides → `—` (jamais masquées).

## Étape 3 — Donuts FC + Puissance (2 colonnes)

### `ZoneDonut` (inline)
- SVG 150×150 viewBox `0 0 150 150`
- `donutArcPath(CX=75, CY=75, R_OUT=65, R_IN=46, startAng, endAng)`
- Légende flex à droite : carré 10×10 couleur + label + %

### Calcul `pwDist` (7 zones Coggan FTP)
```
Z1 <55%   #94a3b8
Z2 56-75% #06B6D4
Z3 76-90% #10B981
Z4 91-105% #F59E0B
Z5 106-120% #F97316
Z6 121-150% #EF4444
Z7 >150%  #7C2D12
```
Compté sur les watts de la portion. Pourcentages normalisés sur le total.

### Calcul `hrDist` (5 zones)
- Si `hrZones` (config user) ≥ 5 → utilise les bornes user
- Sinon fallback : 5 buckets à 60% / 70% / 80% / 90% / max de la portion
- Couleurs fixes `HR_ZONE_COLORS = ['#06B6D4', '#10B981', '#F59E0B', '#F97316', '#EF4444']`

### Layout
Grille `repeat(2, 1fr)` (responsive `1fr` mobile via `.sel-donuts-grid`).

## Étape 4 — Courbes : réutilisation `ActivityCurves`

### Activity sliced
```ts
const slicedActivity: Activity = {
  ...activity,
  streams: activity.streams ? {
    time:      activity.streams.time?.slice(i1, i2 + 1),
    distance:  activity.streams.distance?.slice(i1, i2 + 1),
    altitude:  activity.streams.altitude?.slice(i1, i2 + 1),
    heartrate: activity.streams.heartrate?.slice(i1, i2 + 1),
    velocity:  activity.streams.velocity?.slice(i1, i2 + 1),
    watts:     activity.streams.watts?.slice(i1, i2 + 1),
    cadence:   activity.streams.cadence?.slice(i1, i2 + 1),
    temp:      activity.streams.temp?.slice(i1, i2 + 1),
  } : null,
}
```
Passé en `<ActivityCurves activity={slicedActivity} />` — **rendu identique à la fiche principale** (toggle 3 formats, crosshair, tooltip Empilé/Superposé/Mono, bulle desktop portalisée).

### Suppression des 6 mini-courbes inlines + bars zones
Tout le block JSX qui faisait `charts.filter(c => c.data).map(...)` + 2 bar charts polarisation puissance / zones FC → supprimé. Remplacé par `<ActivityCurves />`.

## Étape 5 — Style global du panneau
- `background: var(--bg)`
- `borderRadius: 16px 16px 0 0` (était 18px)
- `maxHeight: 90vh` (était 85vh)
- `overflowY: auto`, `paddingBottom: 24`
- Plein écran via `left: 0, right: 0, bottom: 0` (déjà OK)
- Portal sur `document.body` via `createPortal` (déjà OK)

## Étape 6 — Responsive
CSS `.sel-stats-grid` et `.sel-donuts-grid` :
```css
.sel-stats-grid   { grid-template-columns: repeat(2, 1fr); }
.sel-donuts-grid  { grid-template-columns: 1fr; }
@media (min-width: 768px) {
  .sel-stats-grid  { grid-template-columns: repeat(4, 1fr); }
  .sel-donuts-grid { grid-template-columns: 1fr 1fr; }
}
```

## Caller (ActivityCurves)
Mise à jour pour passer streams **bruts** (pas `series` smoothés — ActivityCurves smoothe lui-même côté slicedActivity) + `activity={activity}` :
```tsx
<SelectionSheet
  sel={selection}
  activity={activity}
  time={s.time ?? []}
  distance={s.distance ?? null}
  watts={s.watts ?? null}
  hr={s.heartrate ?? null}
  velocity={s.velocity ?? null}
  alt={s.altitude ?? null}
  cadence={s.cadence ?? null}
  temp={s.temp ?? null}
  ftp={activity.ftp_at_time ?? null}
  onClose={...}
/>
```
Le 2e caller (dead-code SyncCharts) a aussi été updaté pour ne pas casser la compilation.

## Inchangé
- Animations CSS `selSheetUp/Down/FadeIn/FadeOut` — non touchées
- `ActivityCurves` (composant principal) — réutilisé tel quel, aucune modif
- Portal sur `document.body` du panneau — préservé
- Calculs internes existants (`npSeg`, `dPlus/dMinus`, `freePct`, `avgOf/maxOf/minOf`) — préservés
- API portail tooltip desktop — préservée (ActivityCurves portale sa bulle elle-même)

## Vérification
- ✅ `npm run build` exit 0
- ✅ 4 cols stats grille avec valeurs 24px lisibles
- ✅ 2 donuts FC + Power avec calculs sur la portion sélectionnée
- ✅ `<ActivityCurves activity={slicedActivity} />` rendu identique à la fiche principale
- ✅ Bulle de tooltip = identique (le portal createPortal d'ActivityCurves est utilisé tel quel)
- ✅ Responsive : 2 cols stats / 1 col donut sur < 768px
- ✅ Stats vides → `—` en var(--text-dim), jamais masquées
- ✅ Border-radius 16, maxHeight 90vh
