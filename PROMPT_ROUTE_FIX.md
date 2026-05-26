# PROMPT — Route Creator Fix

## Problème 1 — Tracé manquant
ORS échoue silencieusement (catch vide) → snappedPoints reste vide → pas de Polyline.
Fix : fallback ligne droite entre waypoints si ORS absent/fail.
Logs diagnostics ajoutés : clé ORS, waypoints, erreur.

## Problème 2 — Couleur ligne
Polyline utilisait color/weight/opacity (ancienne API react-leaflet v5).
Fix : pathOptions={{ color: '#06B6D4', weight: 4, opacity: 0.9, lineCap: 'round', lineJoin: 'round' }}.

## Fichiers modifiés
- src/components/record/RouteCreator.tsx
  - doSnap : catch avec log + fallback waypoints directs
  - Polyline : pathOptions #06B6D4
  - displayPts : snapped || fallback waypoints
- .env.local : NEXT_PUBLIC_ORS_KEY= ajouté (placeholder)
