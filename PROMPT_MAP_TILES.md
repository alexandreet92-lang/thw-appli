# PROMPT — Map Tiles MapTiler

## Objectif
Remplacer toutes les tuiles CartoCDN / Arcgis / OpenStreetMap par MapTiler.

## Variable d'environnement
NEXT_PUBLIC_MAPTILER_KEY (dans .env.local et Vercel → Settings → Environment Variables)

## URLs MapTiler
- Standard  : https://api.maptiler.com/maps/outdoor-v2/{z}/{x}/{y}.png?key=KEY
- Satellite : https://api.maptiler.com/maps/satellite/{z}/{x}/{y}.jpg?key=KEY
- Hybride   : https://api.maptiler.com/maps/hybrid/{z}/{x}/{y}.jpg?key=KEY

## Règles
- Supprimer subdomains partout
- tileSize: 512, zoomOffset: -1 sur chaque TileLayer
- Attribution : MapTiler | OpenStreetMap
- Pas de layer overlay séparé pour le hybride (MapTiler l'intègre nativement)

## Fichiers modifiés
- src/components/record/SessionTraceMap.tsx (L.tileLayer dark/light → outdoor)
- src/components/record/MapBackground.tsx (TILES std/sat/hyb)
- src/components/gpx/GpxRouteMap.tsx (L.tileLayer OSM → outdoor)
- src/components/gpx/GpxFullView.tsx (L.tileLayer OSM → outdoor)
- src/app/planning/page.tsx (osmLayer / satLayer / hybridLayer)
