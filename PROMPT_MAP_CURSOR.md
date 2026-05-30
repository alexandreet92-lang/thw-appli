# PROMPT_MAP_CURSOR — Curseur carte + tooltip thématisé + expand redesign

## 4 parties indépendantes

### Partie 1 — isOverCharts (cursor uniquement dans la zone charts)
`SyncCharts` : ajout état `isOverCharts`.
- `onMouseEnter` sur le container div → `setIsOverCharts(true)`
- `onMouseLeave` → `setIsOverCharts(false)` + reset curseur + appel `onHoverGps?.(null)`
- Cursor line : conditionné par `isOverCharts && cursorPct !== null`
- Tooltip : conditionné par `isOverCharts && cursor !== null`

### Partie 2 — Tooltip thématisé light/dark
`globals.css` : ajout sélecteur `[data-chart-tooltip]`.
- Light mode : fond blanc `rgba(255,255,255,0.97)`, texte `#0f172a`, bordure `#e2e8f0`
- Dark mode `.dark` et `@media prefers-color-scheme: dark` : fond sombre, texte clair
Tooltip div : ajout attribut `data-chart-tooltip=""`.
Inline styles supprimés : `backgroundColor`, `boxShadow`, `border`.
Couleurs de texte inline : `color: var(--text-dim)` pour le temps, `color: var(--text)` pour les valeurs.

### Partie 3 — Map expand/collapse redesign
`ActivityMapCard` : passage en props contrôlées `expanded?: boolean`, `onToggle?: () => void`.
- Suppression état interne `expanded`
- Mode expanded (desktop) : `position: 'relative', width: '100%', height: 420` (plus de fixed)
- Bouton expand masqué sur mobile (`isMobile`)
`ActivityDetail` : ajout état `mapExpanded`.
- Quand `mapExpanded` (desktop seulement) : la carte sort du flex hero+map
  et s'affiche en pleine largeur (section séparée, height: 420) sous le héros
- Quand compact : carte dans colonne droite 35% comme avant
- `onToggle={() => setMapExpanded(v => !v)}` passé à `ActivityMapCard`

### Partie 4 — Point rouge sur carte suivant le curseur
`ActivityMapCard` + `ActivityMapInner` : ajout prop `hoverGps?: {lat:number;lng:number}|null`.
`ActivityMapInner` : `CircleMarker` rouge vif (radius 8, fillColor `#FF4444`, pas de pulsation) quand `hoverGps` défini.

`ActivityDetail` :
- `decodePolyline()` copié depuis ActivityMapCard (fonction pure)
- `polylinePoints` calculé via `useMemo` depuis `a.summary_polyline` ou `a.raw_data`
- `hoverGps` state : `useState<{lat:number;lng:number}|null>(null)`
- `setHoverGps` passé à `SyncCharts` via prop `onHoverGps`
- `hoverGps` passé à `ActivityMapCard`

`SyncCharts` : nouvelles props `polylinePoints?: LatLng[]`, `onHoverGps?: (gps: LatLng|null) => void`.
- `polyCumDist` mémoïsé depuis `polylinePoints` (distances cumulées le long du tracé)
- `findGpsAtDistance(distMeters, points, cumDist)` : recherche linéaire + interpolation
- Dans `handleMove` : si `polylinePoints` + `s.distance` → calcul `hoverGps` + appel `onHoverGps`
- Dans `onMouseLeave` : `onHoverGps?.(null)`

## Fichiers modifiés
- `src/app/globals.css`
- `src/app/activities/page.tsx` (SyncCharts + ActivityDetail)
- `src/components/activity/ActivityMapCard.tsx`
- `src/components/activity/ActivityMapInner.tsx`
