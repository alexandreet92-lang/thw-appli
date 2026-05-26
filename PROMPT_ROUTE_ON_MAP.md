# PROMPT — Route on Map

## OBJECTIF
Quand un parcours est chargé avant de démarrer, il s'affiche sur la carte
de la page record avec : tracé cyan, marqueur vert départ, marqueur rouge arrivée,
fitBounds automatique, profil altimétrique dans le panel bas.

## ÉTAPE 1 — Propagation du parcours

### Type partagé (inline dans chaque fichier)
```ts
interface ActiveRoute {
  snapped_points: { lat: number; lng: number }[]
  elevation_profile: { distanceM: number; altitudeM: number }[]
}
```

### RouteLibrary.tsx
- Ajouter `elevation_profile: { distanceM: number; altitudeM: number }[] | null` à l'interface `Route`
- `onUseRoute` type : `(route: ActiveRoute) => void`
- Call : `onUseRoute({ snapped_points: (route.snapped_points ?? route.waypoints).map(p=>({lat:p.lat,lng:p.lng})), elevation_profile: route.elevation_profile ?? [] })`

### RouteCreator.tsx
- `onLoadRoute` type : `(route: ActiveRoute) => void`
- Bridge RouteLibrary : `onUseRoute={route => { onLoadRoute(route); onClose() }}`

### page.tsx
- `activeRoutePoints` → `activeRoute: ActiveRoute | null`
- RouteCreator `onLoadRoute={route => { setActiveRoute(route); setRouteCreatorOpen(false) }}`
- MapBackground : `activeRoute={activeRoute}` (supprimer `trackPoints` du parcours)

## ÉTAPE 2 — Carte MapBackground

### MapBackground.tsx
- Nouveaux imports : `Polyline, CircleMarker` depuis react-leaflet
- Nouveau prop : `activeRoute?: ActiveRoute | null`
- Composant interne `FitBounds({ activeRoute })` : useEffect → `map.fitBounds(snapped_points, {padding:[40,40]})`
  déclencheur = référence `activeRoute`
- Dans MapContainer si `activeRoute.snapped_points.length > 1` :
  - `<Polyline positions={...} pathOptions={{ color:'#06B6D4', weight:3, opacity:0.8 }} />`
  - `<CircleMarker center={start} radius={6} pathOptions={{ fillColor:'#10B981', fillOpacity:1, color:'white', weight:2 }} />`
  - `<CircleMarker center={end} radius={6} pathOptions={{ fillColor:'#EF4444', fillOpacity:1, color:'white', weight:2 }} />`
  - `<FitBounds activeRoute={activeRoute} />`

## ÉTAPE 3 — Panel altimétrique (page.tsx)

### Avant démarrage, si parcours chargé
- `ElevationChart` importé dynamiquement `{ ssr: false }`
- Panel height : `activeRoute && activeRoute.elevation_profile.length > 1 ? 238 : 132`
- Afficher `<ElevationChart data={activeRoute.elevation_profile} height={90} isDark={isDark} />`
  au-dessus des 3 boutons dans le panel, avec padding `8px 16px 0`
- Une fois la séance démarrée (view !== 'home'), le panel disparaît → profil aussi

## ÉTAPE 4 — fitBounds
- Géré dans `FitBounds` inside MapContainer (voir ÉTAPE 2)
- Déclenché quand `activeRoute` change de référence (sélection d'un nouveau parcours)

## Fichiers modifiés
- PROMPT_ROUTE_ON_MAP.md
- src/app/record/page.tsx
- src/components/record/MapBackground.tsx
- src/components/record/RouteLibrary.tsx
- src/components/record/RouteCreator.tsx
