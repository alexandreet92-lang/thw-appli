# PROMPT_MOBILE_STRAVA — Layout Strava sur mobile

## Objectif
Redesign complet de la vue détail activité sur mobile (< 768px) en layout Strava.
Desktop (≥ 768px) : zéro changement.

## Layout cible
```
[Carte plein écran edge-to-edge, hauteur calc(55vh - 60px), sticky top:0]
        ↕ bottom sheet glisse par-dessus
[Card avec handle, borderRadius 20px 20px 0 0, fond thémé]
  → Nom éditable (ActivityTitle) + sport · date
  → Stats 2 colonnes (grille avec séparateurs fins)
  → Section DONNÉES (5 blocs de données)
  → Section COURBES (SyncCharts)
  → Section ZONES (ZoneBars, pas de donuts)
  → Section COURBE DE PUISSANCE
  → Section DÉCOUPLAGE (repliable)
  → Section DURÉE CUMULÉE (repliable)
  → Bouton Supprimer (bas de page)
```

## Étape 1 — Carte hero sticky
- `position: sticky, top: 0, height: calc(55vh - 60px)`
- ActivityMapCard avec `mobileHero={true}`
- Fallback gradient si pas de GPS
- Bouton retour overlay (cercle blanc, blur, top-left de la carte)

## Étape 2 — Bottom sheet
- `position: relative, zIndex: 2, marginTop: -20px`
- `borderRadius: 20px 20px 0 0`
- `animation: slideUpSheet 0.45s cubic-bezier(0.32, 0.72, 0, 1) both`
- Attribut `data-bottom-sheet=""` pour le fond thémé

## Étape 3 — Fond bottom sheet (globals.css)
```css
[data-bottom-sheet] { background-color: #ffffff !important; }
.dark [data-bottom-sheet] { background-color: #020617 !important; }
@media (prefers-color-scheme: dark) { [data-bottom-sheet] { background-color: #020617 !important; } }
```

## Étape 4 — Animation (globals.css)
```css
@keyframes slideUpSheet {
  from { transform: translateY(60px); opacity: 0; }
  to   { transform: translateY(0);    opacity: 1; }
}
```

## Étape 5 — Prop `mobileHero` dans ActivityMapCard
- `width: 100%, height: 100%, borderRadius: 0`
- Pas de boutons expand/fullscreen en mode mobileHero

## Étape 6 — Stats 2 colonnes
- Grille 2 colonnes, séparateurs fins via border
- 6 stats : Distance, Durée, Watts/Allure, D+, TSS, Vitesse
- Label uppercase 11px + valeur 22px bold

## Structure page.tsx
- Return ternaire : `isMobile ? <mobile-layout> : <desktop-layout>`
- Données partagées : `dataBlocks` JSX variable + `sharedModals` variable
- Desktop : aucun changement fonctionnel

## Fichiers modifiés
- `src/components/activity/ActivityMapCard.tsx`
- `src/app/globals.css`
- `src/app/activities/page.tsx`
