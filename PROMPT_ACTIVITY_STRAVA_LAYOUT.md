# PROMPT_ACTIVITY_STRAVA_LAYOUT — Layout Strava-style mobile

## Étape 1 — Vérification du contenu (préalable)

`grep` sur la branche mobile (`src/app/activities/page.tsx`) :

| Section | Présence |
|---|---|
| Titre + sport · date | ✅ ligne 5290 |
| Stats 3×2 | ✅ ligne 5303 |
| Records battus | ✅ ligne 5360 |
| Bouton IA globale + AIBubble | ✅ ligne 5365 |
| Suite de l'analyse (sections détaillées, courbes, laps) | ✅ rendu via le sheet content jusqu'à ~5530 |
| sharedModals | ✅ ligne 5590 |

**Rien n'a été supprimé** lors des refactos précédentes. La perception « contenu manquant » venait probablement du fait qu'avant cette refonte le sheet collait au bas de la map (`marginTop = 52vh`) sans overlap ; ici on passe à un overlap de 10vh visible, avec drag handle, ce qui change l'aspect visuel du haut du sheet.

## Étape 2 — Layout Strava

### Structure cible
```
<wrapper data-fullscreen-activity ref={mobileScrollRef}>     // fixed inset 0, overflow-y auto, padding-top safe-area, scroll container
  <map-sticky sticky top:0 height:60vh z:1>                  // reste collée au top
    <map-zoom ref={mapZoomRef} 100%×100% will-change>        // scale appliqué via scroll listener
      <ActivityMapCard mobileHero />
    </map-zoom>
  </map-sticky>

  <back-button position:fixed top:safe+12 left:12 z:30 />    // ne zoome PAS (hors map)

  <sheet margin-top:-10vh z:10 bg:var(--bg) radius:20 shadow box-shadow:0-4px24>
    <handle 40×4 var(--border-mid)>
    <title>
    <stats>
    <records>
    <AI bubble>
    ...reste contenu inchangé...
  </sheet>
</wrapper>
```

### Modifications dans `src/app/activities/page.tsx`
1. **`mobileScrollRef` + `mapZoomRef`** (`useRef<HTMLDivElement>`) ajoutés au component body (juste après le `useEffect` hide-app-header).
2. **`useEffect` parallax** : écoute `scroll` sur le wrapper via `wrapper.addEventListener('scroll', ..., {passive:true})`, throttle par `requestAnimationFrame`, applique `transform: scale(1 + y/1500)` capé à 1.15 sur `mapZoomRef.current`.
3. **Wrapper mobile** : `position:fixed; inset:0; overflowY:auto; padding-top: env(safe-area-inset-top, 0px); box-sizing:border-box; background:var(--bg); WebkitOverflowScrolling:touch`. Le wrapper EST le scroll container.
4. **Carte sticky** : `position:sticky; top:0; height:60vh; z-index:1; overflow:hidden`. Reste au top du wrapper pendant le scroll. À l'intérieur, le `mapZoomRef` div (100%×100%, `transform-origin:center`, `will-change:transform`, `transition:transform 0.1s linear`) accueille la carte.
5. **Bouton retour** : sorti du div carte, désormais `position:fixed` au niveau du wrapper, `z-index:30`. Ne zoome pas avec la carte.
6. **Sheet** : `margin-top:-10vh` (overlap 10vh) + `z-index:10` + `background:var(--bg)` + `border-radius:20px 20px 0 0` + `box-shadow:0 -4px 24px rgba(0,0,0,0.08)` + `padding-bottom: calc(120px + env(safe-area-inset-bottom))` + `min-height:60vh`. Animation `slideUpSheet` retirée (pas nécessaire avec le nouveau layout sticky).
7. **Handle** : 40×4, `border-radius:2`, `var(--border-mid)`.

Toutes les sections internes du sheet (titre, stats, records, IA, sections détaillées, courbes, laps) restent strictement à l'identique. Aucun composant supprimé.

## Étape 3 — Onglets Training masqués
Déjà en place : `globals.css` masque `[data-app-header]`, `[data-mobile-nav]`, `[data-training-topbar]`, `[data-training-tabs]` via `body:has([data-fullscreen-activity])` et `body.hide-app-header`. Le wrapper porte toujours `data-fullscreen-activity`, le useEffect existant ajoute `body.hide-app-header`. Rien à refaire.

## Étape 4 — Desktop
La branche desktop (`isMobile === false`) est strictement inchangée. Pas de portal, pas de sticky, pas de parallax. Le `useEffect` parallax `return` immédiatement si `window.innerWidth >= 768`.

## Vérification
- npm run build : 0 erreur TS
- Mobile :
  - Map sticky 60vh sous la safe-area iOS, plus d'espace blanc en haut
  - Bouton retour blanc rond cercle visible
  - Sheet glisse par-dessus avec drag handle visible
  - Scroll → sheet remonte et couvre la map ; map zoom 1.0 → 1.15 sur les premiers 200px (lisse via rAF)
  - Onglets Données/Analyse/Progression masqués
  - Tout le contenu (titre, stats, records, AI, analyse, courbes, laps) reste accessible
- Desktop : strictement intouché
