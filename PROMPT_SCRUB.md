# PROMPT_SCRUB — Scrubbing profil altimétrique → point GPS sur carte

## Contexte

`ElevationChart.tsx` affiche le profil d'élévation d'un parcours.
`RouteCreator.tsx` intègre le graphe et la carte Leaflet.

Quand le doigt glisse sur le profil alti, un point rouge apparaît sur
la carte à la position GPS correspondante. Il disparaît au relâchement.

---

## ÉTAPE 0 — Construction du path : index → distance (bug corrigé)

**Avant** : `getX = (i: number) => PAD.left + (i / n) * cW`
→ Incorrect : les points GPS ne sont pas équidistants. Le curseur
  visuel ne tombait pas sur le bon point.

**Après** : `getX = (distM: number) => PAD.left + (distM / totalM) * cW`
  où `totalM = pts[pts.length - 1].distanceM`

`buildSmoothPath` signature mise à jour : `getX: (distM: number) => number`
Appel : `getX(d.distanceM)` au lieu de `getX(i)`.

Axis X labels mis à jour : `x={getX(pts[idx].distanceM)}`.

---

## ÉTAPE 1 — Helper `indexForDistance`

Recherche binaire sur `data[i].distanceM` pour trouver l'index le plus
proche d'une distance cible (en mètres).

---

## ÉTAPE 2 — ElevationChart : nouvelles props + handler scrub

```typescript
interface ElevationChartProps {
  data: { distanceM: number; altitudeM: number }[]
  snappedPoints?: { lat: number; lng: number }[]
  onPositionChange?: (point: { lat: number; lng: number } | null) => void
}
```

`handleMove` mis à jour :
- `idx` calculé via `indexForDistance(data, frac * totalM)` (plus `Math.round`)
- Appel `onPositionChange(gps)` si props présentes
- Mapping 1:1 si `snappedPoints.length === data.length`, sinon proportionnel

`onTouchEnd` / `onMouseLeave` appellent aussi `onPositionChange?.(null)`.

---

## ÉTAPE 3 — RouteCreator : état + rendu point rouge

```typescript
const [scrubPosition, setScrubPosition] = useState<{lat:number;lng:number}|null>(null)

<ElevationChart
  data={elevationProfile}
  snappedPoints={snappedPoints}
  onPositionChange={setScrubPosition}
/>

// dans MapContainer :
{scrubPosition && (
  <CircleMarker
    center={[scrubPosition.lat, scrubPosition.lng]}
    radius={8}
    pathOptions={{ fillColor: '#EF4444', fillOpacity: 1, color: '#fff', weight: 2.5 }}
  />
)}
```

---

## ÉTAPE 4 — Vérification lat/lng

`snappedPoints` dans RouteCreator est `SnappedPoint[]` avec `{ lat, lng }`.
La Polyline du tracé utilise déjà `p.lat, p.lng` (ligne 166) → format correct.
Le `CircleMarker` scrub utilise le même format → pas d'inversion.

---

## Fichiers modifiés

- `src/components/record/ElevationChart.tsx`
- `src/components/record/RouteCreator.tsx`
