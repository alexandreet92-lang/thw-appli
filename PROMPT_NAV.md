# PROMPT_NAV — Fixes navigation swipe + propagation tactile carte

## Contexte

Les écrans d'enregistrement (Running, Cycling, Hiking, MTB, Ski, Trail) utilisent un système de navigation verticale par swipe (haut/bas) pour changer de page. Ces écrans contiennent une page carte (MapBackground / MapContainer). Deux bugs existent :

- **Bug A** : Les gestes tactiles sur la carte déclenchent un changement de page. Les touch events natifs de Leaflet remontent jusqu'aux handlers React `onTouchStart`/`onTouchEnd` du conteneur parent, causant des changements de page non souhaités lors de l'interaction avec la carte.
- **Bug B** : La navigation n'est pas circulaire. Sur la dernière page, swiper vers le bas ne ramène pas à la première page (et inversement).

---

## FIX A — Bloquer la propagation native des touch events sur la carte

La source du problème est que `e.stopPropagation()` React ne bloque pas les listeners natifs attachés sur les ancêtres. Il faut attacher des listeners natifs directement sur l'élément DOM contenant la carte.

**Fichier modifié : `src/components/record/MapBackground.tsx`**

```typescript
const mapWrapRef = useRef<HTMLDivElement>(null)

useEffect(() => {
  const el = mapWrapRef.current
  if (!el) return
  const stop = (e: TouchEvent) => e.stopPropagation()
  el.addEventListener('touchstart', stop, { passive: true })
  el.addEventListener('touchmove',  stop, { passive: true })
  el.addEventListener('touchend',   stop, { passive: true })
  return () => {
    el.removeEventListener('touchstart', stop)
    el.removeEventListener('touchmove',  stop)
    el.removeEventListener('touchend',   stop)
  }
}, [])

// JSX :
<div ref={mapWrapRef} style={{ position: 'relative', width: '100%', height: '100%' }}>
  <MapContainer ... />
  <LayerSelector ... />
</div>
```

---

## FIX B — Navigation circulaire par modulo

Remplacement de `Math.min` / `Math.max` par arithmétique modulo dans les handlers `handleTouchEnd` de tous les Screen.

```typescript
// Avant
if (dy < -50) setPageIndex(i => Math.min(pages.length - 1, i + 1))
else if (dy > 50) setPageIndex(i => Math.max(0, i - 1))

// Après
if (dy < -50) setPageIndex(i => { const n = pages.length; return n === 0 ? i : (i + 1) % n })
else if (dy > 50) setPageIndex(i => { const n = pages.length; return n === 0 ? i : (i - 1 + n) % n })
```

**Fichiers modifiés** :
- `src/components/record/CyclingScreen.tsx`
- `src/components/record/RunningScreen.tsx`
- `src/components/record/HikingScreen.tsx`
- `src/components/record/MTBScreen.tsx`
- `src/components/record/SkiScreen.tsx`
- `src/components/record/TrailScreen.tsx`

---

## Note duplication

La logique de navigation (`handleTouchStart` / `handleTouchEnd` + `pageIndex` state) est **identique à la virgule près** dans les 6 fichiers Screen. C'est un candidat clair à une factorisation dans un hook `useSwipePages(pages)` — mais ce n'est pas l'objet de ce prompt, ne pas factoriser maintenant.
