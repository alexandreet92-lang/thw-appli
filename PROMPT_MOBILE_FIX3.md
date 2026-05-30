# PROMPT_MOBILE_FIX3 — Correctifs mobile page activité

## FIX 1 — Supprimer le dropdown "Analyse / Activités et détails"
- Trouver le sélecteur de section (dropdown mobile) au-dessus de la carte
- Le masquer sur mobile (display: none ou suppression du JSX)
- La carte doit commencer immédiatement sous la status bar

## FIX 2 — Carte vraiment edge-to-edge
- Identifier les ancêtres avec padding/margin horizontal
- Forcer padding: 0, margin: 0, max-width: 100vw sur les ancêtres mobile
- width: 100vw, left: 0, borderRadius: 0 sur le conteneur carte

## FIX 3 — Supprimer le point rouge en double
- Un seul CircleMarker rouge = hoverGps (absent au chargement)
- Vérifier que les markers départ/arrivée sont corrects (vert/rouge voulus)
- Supprimer tout doublon accidentel

## FIX 4 — Vitesse en 6ème cellule des stats
- Tableau STATS : 6 valeurs dont Vitesse (avg_speed_ms × 3.6)
- Toutes les 6 cellules doivent être visibles

## Fichiers modifiés
- `src/app/activities/page.tsx`
- `src/components/activity/ActivityMapInner.tsx`
- `src/app/globals.css` (si nécessaire)
