# PROMPT — Route Polish (3 fixes)

## FIX 1 — Qualité carte satellite
Ajouter maxNativeZoom={18} sur tous les TileLayers MapTiler satellite/hybrid.
Fichiers : RouteCreator.tsx, MapBackground.tsx, SessionTraceMap.tsx.

## FIX 2 — Courbe altimétrique lisse
Dans ElevationChart.tsx :
- Remplacer les commandes L (ligne droite) par des courbes Bézier cubiques C
- Downsample à 150 points max si > 200 points
- L'areaD (fill) partage la même courbe lisse

## FIX 3 — Panel bas draggable (RouteCreator.tsx)
- États : 'collapsed' (80px) | 'expanded' (50vh)
- Drag vertical touch pour toggle
- Click drag indicator pour toggle
- Transition height 300ms cubic-bezier
- Stats toujours visibles ; ElevationChart + légende masqués si collapsed

## Fichiers modifiés
- PROMPT_ROUTE_POLISH.md
- src/components/record/RouteCreator.tsx
- src/components/record/ElevationChart.tsx
- src/components/record/MapBackground.tsx
- src/components/record/SessionTraceMap.tsx
