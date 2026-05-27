# PROMPT_NAV_FIX — Réparation du Fix A cassé (PROMPT_NAV)

## Problème

Le Fix A de PROMPT_NAV ajoutait des listeners natifs `touchstart/touchmove/touchend`
avec `stopPropagation()` sur le wrapper de `MapBackground`. Cela cassait le pan et
le pinch-zoom : Leaflet attache ses propres handlers sur `document` pendant un
drag/zoom, et `stopPropagation()` les empêchait de recevoir les événements.

---

## ÉTAPE 1 — Annuler le fix cassé

**`src/components/record/MapBackground.tsx`** :
- Supprimer `mapWrapRef` (le `useRef<HTMLDivElement>`)
- Supprimer le `useEffect` qui ajoutait les listeners natifs avec `stop`
- Supprimer `useRef` de l'import si plus utilisé
- Le `<div>` wrapper garde sa place mais perd `ref={mapWrapRef}`

---

## ÉTAPE 2 — Bon fix : guard `swipeFromMap` dans les handlers React

Le détecteur de swipe de page dans chaque Screen utilise des handlers React
`onTouchStart` / `onTouchEnd`. Si le geste démarre sur un élément `.leaflet-container`
(la classe racine de tout MapContainer react-leaflet), le swipe de page est ignoré.
La carte reçoit alors tous ses événements sans interférence.

Pattern appliqué dans les 6 Screen files :

```typescript
const swipeFromMap = useRef(false)

const handleTouchStart = (e: React.TouchEvent) => {
  swipeFromMap.current = !!(e.target as HTMLElement)?.closest?.('.leaflet-container')
  if (swipeFromMap.current) return
  touchRef.current = { y: e.touches[0].clientY, t: Date.now() }
}
const handleTouchEnd = (e: React.TouchEvent) => {
  if (swipeFromMap.current) { swipeFromMap.current = false; return }
  if (!touchRef.current) return
  const dy = e.changedTouches[0].clientY - touchRef.current.y
  const dt = Date.now() - touchRef.current.t
  touchRef.current = null
  if (dt > 600) return
  // navigation circulaire (PROMPT_NAV FIX B, inchangée)
  if (dy < -50) setPageIndex(...)
  else if (dy > 50) setPageIndex(...)
}
```

**Fichiers modifiés** :
- `src/components/record/MapBackground.tsx` — suppression useEffect cassé
- `src/components/record/CyclingScreen.tsx`
- `src/components/record/RunningScreen.tsx`
- `src/components/record/HikingScreen.tsx`
- `src/components/record/MTBScreen.tsx`
- `src/components/record/SkiScreen.tsx`
- `src/components/record/TrailScreen.tsx`

---

## Comportement attendu

| Geste | Résultat |
|---|---|
| Swipe vertical sur la zone données | Change de page |
| Pan sur la carte | Carte pan librement |
| Pinch-zoom sur la carte | Carte zoom librement |
| Swipe vertical démarré sur la carte | Ignoré par la nav de page |
| Swipe depuis données, doigt dérive sur carte | Change de page quand même |
