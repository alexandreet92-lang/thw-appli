# PROMPT_SHEET_FLUID_ZOOM — Map zoom fluide pendant le drag du sheet

## Fichiers modifiés
- `src/app/activities/page.tsx` (handlers + refactor des useEffects)
- `src/app/globals.css` (will-change sur leaflet-container)

## Cause racine du saccade
Avant : le `transform: scale(...)` de la map était piloté par un `useEffect([sheetPos])` qui ne se déclenchait QUE au `touchend` (quand `setSheetPos(nearest.pos)` était appelé). Pendant le drag, l'utilisateur voyait :
- Le sheet bouger en temps réel (via `setDragOffset` à chaque `touchmove`)
- La map **immobile**
- Puis un saut visuel d'un coup au lâcher

S'ajoutait un **scroll-zoom listener** sur le scroll container qui appliquait sa propre formule `scale(1 + scrollTop/600 * 0.15)` et **écrasait** le scale du sheet à chaque scroll interne du contenu → conflit + comportement parasite.

## Approche du fix
**Zoom piloté UNIQUEMENT par les handlers du drag** :
- `touchstart` → clear transition pour suivre le doigt sans délai
- `touchmove` → calcule scale `computeMapScale(dragOffset)` et l'applique direct (pas de transition), batched via RAF
- `touchend` → snap vers la position la plus proche + applique scale final avec transition `0.25s cubic-bezier(0.4, 0, 0.2, 1)` + retire la transition après 260 ms

`computeMapScale(offset)` est une fonction CONTINUE et MONOTONE :
- collapsed (+25vh) → 1.0
- default (0) → ~1.056
- expanded (-42vh) → 1.15

Formule : `1 + clamp((offset - collapsed) / (expanded - collapsed)) * 0.15`

## Refactor des refs / hooks

### Ajouts
- `rafIdRef`         : id de la RAF en cours (1 par frame max)
- `pendingOffsetRef` : dernier offset capté, écrit dans la RAF callback
- `computeMapScale(offset)` : helper pur, dépend de `winH`
- `applyMapScale(scale, withTransition)` : applique inline style sur `.leaflet-container`

### Suppressions
- ❌ `useEffect([sheetPos])` qui appliquait `transform: scale(...)` (créait le saut au touchend)
- ❌ `useEffect` scroll-zoom listener (conflictait + sensible au scroll interne du contenu)
- ❌ `sheetScaleRef` (n'est plus partagé entre 2 effets, plus nécessaire)

### Modifications
- `onSheetTouchStart` : clear `leaflet.style.transition` pour le drag
- `onSheetTouchMove` : RAF-throttled, applique scale en direct (sans transition)
- `onSheetTouchEnd` : cancelAnimationFrame + applique scale final avec transition + clear après 260 ms

## CSS additions (globals.css)
```css
.thw-activity-map-sticky .leaflet-container {
  will-change: transform;
  transform-origin: center center;
}
```
Informe le navigateur de provisionner une couche GPU pour le `.leaflet-container` → composites les frames sans repaint coûteux.

## Inchangé
- Sheet `.thw-activity-sheet` : transition / will-change / touch-action déjà OK (commit C)
- État `sheetPos` toujours mis à jour au touchend → impacte `dragOffset` au prochain render (utilisé par le `transform: translateY` du sheet)
- Comportement de snap (3 positions, snap vers le plus proche)
- Bouton retour : non touché
- Contenu sheet : non touché
- Branche desktop : strictement intouchée (les handlers/useEffects sont mobile-only via la branche `isMobile`)

## Garde-fous
- `typeof window` checks indirects (via useEffect existant resize)
- `mobileMapRef.current` null check dans `applyMapScale`
- `.leaflet-container` null check (Leaflet en next/dynamic + ssr:false)
- `cancelAnimationFrame` au touchend (évite override du snap)
- `setTimeout` cleanup transition (sans bloquer le prochain drag)
- Branche desktop épargnée : le code des handlers et helpers est dans la fonction `ActivityDetail` mais n'est invoqué que par les `onTouch*` du sheet, lui-même rendu dans la branche `isMobile ? mobile : desktop`

## Vérification
- npm run build : 0 erreur TS
- Mobile : drag de la handle → map zoome/dézoome en temps réel, sans à-coup
- Au lâcher : snap fluide avec animation `0.25s cubic-bezier(0.4, 0, 0.2, 1)`
- Pas de saut visuel au touchend
- Performance : RAF throttle + will-change → fluide même sur iPhone ancien
- Desktop : aucun changement
