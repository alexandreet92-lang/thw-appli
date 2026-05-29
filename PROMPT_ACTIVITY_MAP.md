# PROMPT_ACTIVITY_MAP — Tracé GPS sur la page Analyse

## Objectif
Afficher le tracé GPS de l'activité sur la page Analyse,
en haut à droite, avec possibilité d'agrandir en modal plein-écran.

## Source des données GPS
Le tracé est stocké dans `raw_data.map.summary_polyline`
(Google polyline encodé, fourni par Strava).
Fallback : `raw_data.map.polyline` ou `snapped_points` (activités enregistrées dans l'app).

## Fichiers créés

### `src/components/activity/ActivityMapCard.tsx`
- Détecte et décode le polyline (`decodePolyline()` — algorithme Google standard)
- Retourne `null` si pas de tracé disponible (pas de rendu vide)
- États : mini (220px desktop, 200px mobile) ↔ expanded (fixed 70vh, max 600px)
- Bouton ⤢ Agrandir / ⤡ Réduire
- Charge `ActivityMapInner` via `dynamic({ ssr: false })` pour éviter le SSR Leaflet

### `src/components/activity/ActivityMapInner.tsx`
- Rendu Leaflet côté client uniquement (`'use client'`)
- Tiles MapTiler identiques à `MapBackground.tsx` (Std / Sat / Hyb)
- Polyline cyan `#06B6D4`, weight 3
- `CircleMarker` vert au départ, rouge à l'arrivée
- `FitBounds` automatique au chargement
- Sélecteur de fond de carte (Std/Sat/Hyb) intégré

## Intégration dans `ActivityDetail` (`src/app/activities/page.tsx`)
- `isMobile` ajouté dans `ActivityDetail` via `useWindowWidth()`
- Layout **desktop** : flex-row, 65% (hero + data blocks) + 35% (carte)
- Layout **mobile** : flex-column, carte pleine largeur sous les données (200px)
- Import ajouté : `import { ActivityMapCard } from '@/components/activity/ActivityMapCard'`
