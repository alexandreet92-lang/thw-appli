# PROMPT_MAPBOX — Migration tuiles MapTiler → Mapbox

## Clé
NEXT_PUBLIC_MAPBOX = [voir .env.local]

## URLs Mapbox
Standard  : https://api.mapbox.com/styles/v1/mapbox/outdoors-v12/tiles/512/{z}/{x}/{y}@2x?access_token=TOKEN
Satellite : https://api.mapbox.com/styles/v1/mapbox/satellite-streets-v12/tiles/512/{z}/{x}/{y}@2x?access_token=TOKEN
Hybride   : https://api.mapbox.com/styles/v1/mapbox/satellite-v9/tiles/512/{z}/{x}/{y}@2x?access_token=TOKEN

## Props TileLayer (react-leaflet)
tileSize={512} zoomOffset={-1} detectRetina={true} maxZoom={20}

## Props L.tileLayer (leaflet impératif)
{ tileSize: 512, zoomOffset: -1, maxZoom: 20 }

## Fichiers modifiés
- .env.local → NEXT_PUBLIC_MAPBOX ajouté
- src/components/activity/ActivityMapInner.tsx
- src/components/record/RouteCreator.tsx
- src/components/record/MapBackground.tsx
- src/components/record/SessionTraceMap.tsx
- src/app/planning/page.tsx
- src/components/gpx/GpxFullView.tsx
- src/components/gpx/GpxRouteMap.tsx
