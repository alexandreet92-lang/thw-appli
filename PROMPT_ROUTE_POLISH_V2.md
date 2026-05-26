# PROMPT — Route Polish V2

## PROBLÈME 1 — Courbe altimétrique lisse
ElevationChart.tsx — SVG custom.
buildSmoothPath(data, getX, getY) : commandes Bézier cubiques C au lieu de L.
Downsample à 150 pts max.
Appliquer à pathD (ligne) et areaD (fill).

## PROBLÈME 2 — Qualité carte satellite
Remplacer tileSize=512 + zoomOffset=-1 par tileSize=256 sans zoomOffset.
Nouvelles URLs :
- std  : maps/outdoor-v2/256/{z}/{x}/{y}.png
- sat  : tiles/satellite-v2/{z}/{x}/{y}.jpg
- hyb  : maps/hybrid/256/{z}/{x}/{y}.jpg
Fichiers : RouteCreator.tsx, MapBackground.tsx

## PROBLÈME 3 — Panel draggable
panelExpanded boolean (vs string), height 45vh/70px, seuil 50px, transition 350ms.
Positions floating buttons : calc(45vh + 16px) / calc(70px + 16px).

## Fichiers modifiés
- PROMPT_ROUTE_POLISH_V2.md
- src/components/record/ElevationChart.tsx
- src/components/record/RouteCreator.tsx
- src/components/record/MapBackground.tsx
