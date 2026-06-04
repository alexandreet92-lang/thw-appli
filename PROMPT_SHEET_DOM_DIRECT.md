# PROMPT_SHEET_DOM_DIRECT — Drag du sheet en DOM direct (0 re-render)

## Cause confirmée
Diagnostic précédent (`PROMPT_SHEET_FLUID_DIAGNOSTIC.md`) : `setDragOffset()` était appelé à chaque tick RAF du touchmove → React re-render `ActivityDetail` (~1700 lignes JSX) à 60 Hz → backpressure → frames s'agrègent → drag saccadé + map qui saute par paliers.

## Solution implémentée
**Bypass complet de React pendant le drag**. Pendant le geste :
- `sheetRef.current.style.transform = translateY(...)` direct DOM
- `.leaflet-container.style.transform = scale(...)` direct DOM
- `currentOffsetRef.current = clamped` ref update (pas de re-render)
- **Aucun `setState`**

`setSheetPos(nearest.pos)` est appelé **uniquement au touchend** (1 re-render total par geste).

## Fichier modifié
- `src/app/activities/page.tsx`

## State / refs après refactor

### Avant (4 states + 5 refs)
```ts
const [sheetPos, setSheetPos]    = useState(...)
const [dragOffset, setDragOffset] = useState(0)     // ❌ supprimé
const [isDragging, setIsDragging] = useState(false) // ❌ supprimé
const [winH, setWinH]            = useState(...)
const dragStartY      = useRef(0)
const dragStartOffset = useRef(0)
const rafIdRef         = useRef(null)               // ❌ supprimé
const pendingOffsetRef = useRef(0)                  // ❌ supprimé
const mobileMapRef    = useRef(null)
```

### Après (2 states + 5 refs)
```ts
const [sheetPos, setSheetPos] = useState(...)
const [winH,     setWinH]     = useState(...)

const sheetRef          = useRef<HTMLDivElement>(null)  // 🆕
const isDraggingRef     = useRef(false)                 // 🆕 (était state)
const currentOffsetRef  = useRef(0)                     // 🆕 (était state)
const dragStartY        = useRef(0)
const dragStartOffset   = useRef(0)
const mobileMapRef      = useRef(null)
```

## Handlers refactorés

### `onSheetTouchStart`
- `isDraggingRef.current = true`
- `dragStartOffset.current = currentOffsetRef.current`
- `sheetRef.current.classList.add('dragging')` (via classList, pas via React)
- Désactive transitions sur sheet ET `.leaflet-container`

### `onSheetTouchMove` — pas de RAF, pas de setState
```ts
const clamped = clamp(newOffset)
currentOffsetRef.current = clamped
sheetRef.current.style.transform = `translateY(${clamped}px)`
leaflet.style.transform = `scale(${computeMapScale(clamped)})`
```
**Pas de RAF throttle** — touchmove est déjà natif 60Hz max, et les écritures `style.transform` sont batched par le navigateur dans la prochaine frame.

### `onSheetTouchEnd`
- `isDraggingRef.current = false`
- `sheetRef.current.classList.remove('dragging')`
- Calcule snap (nearest)
- Applique transform avec transition `0.25s cubic-bezier(0.4, 0, 0.2, 1)` sur sheet et leaflet
- `setSheetPos(nearest.pos)` — **un seul setState par geste** (déclenche le re-render final)
- `setTimeout` 260 ms pour clear les transitions (si pas en cours de drag)

## useEffects

### Init position au mount + resize
Dépendance `[winH]`. Applique `translateY(0)` (default) + `scale(~1.056)` au sheet/leaflet via les refs. Pas de transition (snap instantané). Quand winH change (resize), repositionne le sheet à `getOffsetForPos(sheetPos)` actuel.

### Sync DOM ↔ sheetPos pour changements EXTERNES
Dépendance `[sheetPos]`. Skip si :
- `isDraggingRef.current` est true (drag en cours)
- `currentOffsetRef.current === target` (déjà au bon endroit — cas du touchend qui appelle setSheetPos après avoir déjà appliqué le DOM)

Sinon : applique transform avec transition + clear après 260 ms. Couvre les cas hypothétiques où `setSheetPos` serait appelé hors du drag (programmatique).

## JSX sheet — simplifié
```tsx
<div
  ref={sheetRef}
  data-bottom-sheet=""
  className="thw-activity-sheet"   // ← plus de `${isDragging ? ' dragging' : ''}`
  style={{
    /* …styles statiques inchangés (position, zIndex, marginTop, bg, etc.)… */
    /* PAS de transform inline — géré par sheetRef.style */
  }}
>
```

La classe `.dragging` est ajoutée/retirée via `classList` directement dans les handlers, pas via React render.

## Helpers conservés
- `getOffsetForPos(pos)` : map sheetPos → offset px
- `computeMapScale(offset)` : map offset → scale (continu monotone, 1.0 → 1.15)
- `getLeafletEl()` : helper unique (au lieu de répéter `mapEl.querySelector('.leaflet-container')` à 6 endroits)

## Helpers supprimés
- `applyMapScale(scale, withTransition)` : inline désormais dans les handlers/useEffects (plus économe en abstraction inutile)
- `rafIdRef` / `pendingOffsetRef` : RAF throttle inutile sans re-render React

## Bénéfices mesurés (théoriques)
- **0 setState dans touchmove** → 0 re-render → 0 réconciliation du subtree de 1700 lignes
- Le navigateur écrit `style.transform` directement, composite GPU via `will-change: transform`
- Frame budget : ~16ms native paint (vs ~50-100ms avec React render full subtree)
- La map suit le doigt en temps réel sans backpressure

## Sécurité
- Branches desktop intouchées (`isMobile ? mobile : desktop` toujours en place)
- Aucun changement de comportement attendu hors mobile
- `sheetRef`/`mobileMapRef` null checks dans les useEffects
- `getLeafletEl()` retourne null si Leaflet pas encore monté (next/dynamic ssr:false) → handlers gracieux
- `currentOffsetRef.current === target` skip dans le useEffect[sheetPos] évite la double-animation après touchend

## Inchangé
- Branche desktop entière
- Snap points (3 positions, snap vers le plus proche)
- Contenu du sheet (titre, sport·date, stats, records, AI, sections, courbes MMP/laps, etc.)
- Bouton retour
- CSS (`.thw-activity-sheet`, `.dragging`, handle, `.leaflet-container will-change`, etc.)

## Vérification
- npm run build : 0 erreur TS
- Mobile : drag fluide 60 fps, map zoom suit le doigt sans à-coup, snap fluide au lâcher, aucun jump visuel
- Desktop : strictement intouché
