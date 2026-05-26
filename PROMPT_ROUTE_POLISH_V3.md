# PROMPT — Route Polish V3

## PROBLÈME 1 — ElevationChart courbe lisse (vérification)
ElevationChart.tsx utilise déjà `buildSmoothPath(pts, getX, getY)` pour `pathD` et `areaD`.
Aucune commande `L` dans la génération du chemin. ✓ Déjà correct.

## PROBLÈME 2 — Tiles RouteCreator = MapBackground (vérification)
RouteCreator.tsx utilise déjà les mêmes URLs 256px que MapBackground.tsx :
- std  : maps/outdoor-v2/256/{z}/{x}/{y}.png
- sat  : tiles/satellite-v2/{z}/{x}/{y}.jpg
- hyb  : maps/hybrid/256/{z}/{x}/{y}.jpg
`tileSize={256} maxZoom={19}` — pas de zoomOffset. ✓ Déjà correct.

## PROBLÈME 3 — Géolocalisation au montage + marqueur GPS pulsant
RouteCreator.tsx :
- Ajouter `userPosition` state : `[number, number] | null`
- Composant `GeolocateOnMount` inside MapContainer (useMap + useEffect) :
  - succès : `map.setView(pos, 14)` + `onPosition(pos)`
  - échec / non dispo : `map.setView([46.603354, 1.888334], 6)`
- Marqueur pulsant : 2 CircleMarkers si `userPosition` — halo r=16 fillOpacity=0.2 + dot r=8 fillOpacity=1
- Bouton GPS : aussi appelle `setUserPosition(pos)`

## PROBLÈME 4 — Panel affiné
- `'70px'` → `'72px'` (panelH collapsed)
- Drag indicator : `width:36, height:4, borderRadius:2, background:'rgba(150,150,150,0.4)'`
- ElevationChart wrappé dans `<div style={{opacity:1, transition:'opacity 200ms'}}>` quand expanded

## Fichiers modifiés
- PROMPT_ROUTE_POLISH_V3.md
- src/components/record/RouteCreator.tsx
