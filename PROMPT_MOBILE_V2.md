# PROMPT_MOBILE_V2 — Améliorations mobile page activité

## PARTIE 1 — Masquer le header THW sur la page activité mobile
- Ajouter `data-fullscreen-activity=""` sur le conteneur racine de la page activité mobile
- Ajouter `data-app-header=""` sur le header principal (mobile top bar dans Sidebar.tsx)
- Ajouter dans globals.css :
  ```css
  @media (max-width: 767px) {
    body:has([data-fullscreen-activity]) > header,
    body:has([data-fullscreen-activity]) > nav,
    body:has([data-fullscreen-activity]) [data-app-header] {
      display: none !important;
    }
  }
  ```
- Carte démarre à top: 0, plein écran bord à bord

## PARTIE 2 — Carte pleine largeur + qualité améliorée
- Conteneur carte mobile : margin:0, padding:0, width:100vw, left:0, borderRadius:0
- TileLayer : tileSize={512}, detectRetina={true}, maxZoom={19}
- Double tracé Polyline (effet Strava) : contour blanc weight:7 opacity:0.6 + trait cyan #06B6D4 weight:4

## PARTIE 3 — Stats principales : grille 3×2 compacte
- 6 stats : Distance, Durée, Vitesse, Watts moy., D+, TSS
- Grille 3 colonnes avec séparateurs fins

## PARTIE 4 — Section Données : liste verticale propre
- Une ligne par donnée : label gauche, valeur droite
- Ordre défini dans le prompt

## PARTIE 5 — Zones : remettre Jauges + Donuts sur mobile
- Toggle [Jauges] [Donuts] visible et fonctionnel sur mobile
- Largeur adaptée au mobile

## PARTIE 6 — Touch sur les graphiques
- onTouchMove sur chartsRef.current → même logique que onMouseMove
- passive: false pour permettre e.preventDefault()
- tooltip identique au desktop

## Fichiers modifiés
- `src/app/activities/page.tsx`
- `src/components/activity/ActivityMapInner.tsx`
- `src/app/globals.css`
- `src/components/shared/Sidebar.tsx`
