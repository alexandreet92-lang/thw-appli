# PROMPT_SHEET_FLUID_DIAGNOSTIC — Sheet drag lag + map zoom retardé

**Mode :** lecture seule, aucune modification de code.

---

## Q1 — Handlers tactiles du sheet

**Fichier :** `src/app/activities/page.tsx`
**Lignes :** 4598-4656

### `onSheetTouchStart` (l. 4598-4609)
```ts
function onSheetTouchStart(e: React.TouchEvent) {
  setIsDragging(true)
  dragStartY.current      = e.touches[0].clientY
  dragStartOffset.current = baseOffset
  setDragOffset(baseOffset)
  // Clear la transition sur la leaflet pour suivre le doigt sans délai
  const mapEl = mobileMapRef.current
  if (mapEl) {
    const leaflet = mapEl.querySelector('.leaflet-container') as HTMLElement | null
    if (leaflet) leaflet.style.transition = ''
  }
}
```

### `onSheetTouchMove` (l. 4610-4628)
```ts
function onSheetTouchMove(e: React.TouchEvent) {
  if (!isDragging) return
  const delta     = e.touches[0].clientY - dragStartY.current
  const newOff    = dragStartOffset.current + delta
  const minOffset = -winH * 0.42
  const maxOffset =  winH * 0.25
  const clamped   = Math.max(minOffset, Math.min(maxOffset, newOff))
  pendingOffsetRef.current = clamped

  // Batch via RAF : 1 update par frame quel que soit le débit du touchmove
  if (rafIdRef.current === null) {
    rafIdRef.current = requestAnimationFrame(() => {
      const off = pendingOffsetRef.current
      setDragOffset(off)
      applyMapScale(computeMapScale(off), false)
      rafIdRef.current = null
    })
  }
}
```

### `onSheetTouchEnd` (l. 4629-4656)
```ts
function onSheetTouchEnd() {
  if (!isDragging) return
  setIsDragging(false)
  // Annule un RAF en attente pour éviter d'écraser le snap
  if (rafIdRef.current !== null) {
    cancelAnimationFrame(rafIdRef.current)
    rafIdRef.current = null
  }
  const positions = [
    { pos: 'collapsed' as const, val:  winH * 0.25 },
    { pos: 'default'   as const, val:  0          },
    { pos: 'expanded'  as const, val: -winH * 0.42 },
  ]
  const nearest = positions.reduce((best, curr) =>
    Math.abs(curr.val - dragOffset) < Math.abs(best.val - dragOffset) ? curr : best,
  )
  setSheetPos(nearest.pos)
  setDragOffset(nearest.val)
  // Apply final scale avec transition pour un snap fluide
  applyMapScale(computeMapScale(nearest.val), true)
  // Retire la transition après l'animation pour ne pas gêner le prochain drag
  setTimeout(() => {
    const mapEl = mobileMapRef.current
    if (!mapEl) return
    const leaflet = mapEl.querySelector('.leaflet-container') as HTMLElement | null
    if (leaflet) leaflet.style.transition = ''
  }, 260)
}
```

**Wiring JSX** (l. 5369-5378) :
```tsx
<div
  className="thw-activity-sheet-handle"
  onTouchStart={onSheetTouchStart}
  onTouchMove={onSheetTouchMove}
  onTouchEnd={onSheetTouchEnd}
  onTouchCancel={onSheetTouchEnd}
  style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 8px' }}
>
  <div style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: 'var(--info-border)' }} />
</div>
```

---

## Q2 — useEffect qui touchent au `transform` de la map

### useEffect resize (l. 4587-4593) — N'APPLIQUE PAS de transform
```ts
useEffect(() => {
  if (typeof window === 'undefined') return
  const onResize = () => setWinH(window.innerHeight)
  window.addEventListener('resize', onResize)
  return () => window.removeEventListener('resize', onResize)
}, [])
```
**Déps :** `[]`. Met juste `winH` à jour. Ne touche pas au transform.

### Aucun autre useEffect ne touche au `transform`/`scale` de la map
Confirmé par `grep -n "transform\|scale\|leaflet" src/app/activities/page.tsx` :
- `applyMapScale` (l. 4577) est un **helper synchrone**, appelé UNIQUEMENT depuis les handlers tactiles (touchstart pas directement, touchmove via RAF, touchend direct + setTimeout)
- `computeMapScale` (l. 4568) est un helper pur de calcul

**Aucun useEffect[sheetPos]** : il a été supprimé au commit précédent (`3d2fb26`).
**Aucun scroll-zoom listener** : également supprimé.

**Donc le scale du `.leaflet-container` est piloté UNIQUEMENT par :**
- `onSheetTouchStart` → clear `.transition` (mais pas de nouveau scale)
- `onSheetTouchMove` (via RAF) → `applyMapScale(computeMapScale(off), false)`
- `onSheetTouchEnd` → `applyMapScale(computeMapScale(nearest.val), true)` + clear transition après 260 ms

---

## Q3 — CSS

**Fichier unique :** `src/app/globals.css` (l. 747-768)

### `.thw-activity-sheet` (l. 748-752)
```css
.thw-activity-sheet {
  transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  will-change: transform;
  touch-action: pan-y;
}
```

### `.thw-activity-sheet.dragging` (l. 759-761)
```css
.thw-activity-sheet.dragging {
  transition: none;  /* pendant le drag, suit le doigt sans easing */
}
```

### `.thw-activity-sheet-handle` (l. 762-768)
```css
.thw-activity-sheet-handle {
  touch-action: none;        /* intercepte le geste sur la handle */
  cursor: grab;
}
.thw-activity-sheet-handle:active {
  cursor: grabbing;
}
```

### `.thw-activity-map-sticky .leaflet-container` (l. 755-758)
```css
.thw-activity-map-sticky .leaflet-container {
  will-change: transform;
  transform-origin: center center;
}
```

### `.thw-activity-map-sticky` — wrapper, styles INLINE (pas CSS)
Sur l'élément JSX (l. 5298-5310) :
```ts
style={{
  position: 'sticky',
  top:      0,
  width:    '100%',
  height:   '60vh',
  zIndex:   1,
  overflow: 'hidden',
}}
```
Pas de transition / will-change / transform-origin sur ce niveau — c'est pour le `.leaflet-container` interne.

### Sheet container — styles INLINE (l. 5353-5366)
```tsx
<div
  data-bottom-sheet=""
  className={`thw-activity-sheet${isDragging ? ' dragging' : ''}`}
  style={{
    position:      'relative',
    zIndex:        2,
    marginTop:     '-20px',
    background:    'var(--bg)',
    borderRadius:  '20px 20px 0 0',
    boxShadow:     '0 -4px 24px rgba(0, 0, 0, 0.08)',
    minHeight:     '50vh',
    paddingBottom: 120,
    transform:     `translateY(${currentOffset}px)`,
  }}
>
```

---

## Q4 — State et refs

Toutes les déclarations dans `ActivityDetail` (l. 4540-4558) :

```ts
const mobileMapRef     = useRef<HTMLDivElement>(null)                     // l. 4541

const [sheetPos,   setSheetPos]   = useState<'collapsed' | 'default' | 'expanded'>('default')  // l. 4548
const [dragOffset, setDragOffset] = useState(0)                            // l. 4549
const [isDragging, setIsDragging] = useState(false)                        // l. 4550
const [winH,       setWinH]       = useState<number>(() =>                 // l. 4551-4553
  typeof window !== 'undefined' ? window.innerHeight : 800,
)

const dragStartY        = useRef(0)                                        // l. 4554
const dragStartOffset   = useRef(0)                                        // l. 4555
const rafIdRef          = useRef<number | null>(null)                      // l. 4557
const pendingOffsetRef  = useRef<number>(0)                                // l. 4558
```

**Pas de `leafletContainerRef` dédié** — `applyMapScale` fait `mapEl.querySelector('.leaflet-container')` à chaque appel.

---

## Q5 — Détection runtime

**Logs présents : NON.** Aucun `console.log` dans `onSheetTouchStart`, `onSheetTouchMove`, `onSheetTouchEnd`, `applyMapScale`, ou `computeMapScale`. Aucun log non plus dans les useEffect liés.

Ajouter des logs nécessiterait de modifier le fichier → écarté pour ce diagnostic.

---

## Diagnostic synthèse (causes probables des 2 bugs)

### Bug 1 — Drag du sheet lag (saccadé)

**Hypothèse principale** : à chaque tick RAF du touchmove, `setDragOffset(off)` est appelé → React re-render **toute la fonction `ActivityDetail`** (de la ligne 4400 à ~6100, soit ~1700 lignes de JSX + hooks). Ce subtree contient :
- La carte sticky + Leaflet
- Le sheet (titre, sport·date, stats grid, RecordsBeaten, AI bubble, sections détaillées, courbes MMP / power / hr, GapChart, LapsBikeChart, ZoneBars, LapsChart, etc.)
- Les `sharedModals`

Re-rendre tout ça ~60 fois/seconde pendant un drag est **coûteux côté React** (réconciliation + diffing virtual DOM), même si seul `transform: translateY(...)` change visuellement.

**`will-change: transform`** sur le sheet est OK pour la composition GPU, mais ça n'aide pas la phase React de réconciliation.

**Le RAF throttle est en place** (donc le rythme est de 60 Hz max), mais chaque tick déclenche quand même un setState.

**Causes secondaires possibles :**
- `position: sticky` sur la map + son layer GPU + le sheet en `position: relative` qui se transforme → repaints possibles de la map sticky
- `boxShadow: '0 -4px 24px rgba(0,0,0,0.08)'` sur le sheet → coûteux à repeindre à chaque frame

### Bug 2 — Map ne zoome PAS en temps réel

**Le code A L'AIR correct sur ce point** :
- `applyMapScale(computeMapScale(off), false)` est appelé dans la RAF callback du touchmove
- L'`applyMapScale` fait `leaflet.style.transform = scale(...)` direct (sans transition)

**Hypothèse 1** : la fonction `applyMapScale` est appelée mais `mapEl.querySelector('.leaflet-container')` retourne `null` → silent failure. Possibles raisons :
- L'`isolation: isolate` sur `ActivityMapCard mobileHero` (commit `d9c1d61`) crée un sous-contexte ; le `.leaflet-container` est bien dedans et accessible par `querySelector`, donc *en principe* ça marche
- Toutefois `mobileMapRef` pointe sur le wrapper `<div ref={mobileMapRef} className="thw-activity-map-sticky">`. À l'intérieur : `<ActivityMapCard mobileHero>` qui rend `<ActivityMapInner>` (dynamic `ssr:false`). Le `.leaflet-container` apparaît **après le mount Leaflet**. Si la lib n'a pas encore monté la map, `querySelector` retourne null → scale jamais appliqué. À vérifier par un log.

**Hypothèse 2** : le scale EST appliqué mais sur le mauvais élément. Si `ActivityMapInner` rend un wrapper supplémentaire qui crée son propre stacking ou applique un transform, le scale visuel pourrait sembler ne pas avoir d'effet visible. Improbable mais possible.

**Hypothèse 3** : pendant le drag, `setDragOffset` provoque un re-render lourd. Avant que la frame suivante soit peinte, la RAF du touchmove suivant exécute, qui à son tour appelle `applyMapScale` → mais comme la frame n'a pas été peinte, le navigateur agrège plusieurs `style.transform = ...` en une seule frame finale. Donc visuellement on n'a qu'1 update toutes les 5-10 frames quand React est sous pression. C'est compatible avec le « saut à la fin du geste ».

### Hypothèse de l'auteur du fix pour confirmation
Le RAF throttle protège contre les touchmove à 120 Hz, mais ne protège pas contre les re-renders React excessifs. La solution serait probablement :
- **Découpler le `transform: translateY` du sheet du state React** : pendant le drag, écrire directement `sheetRef.current.style.transform = translateY(...)` au lieu de `setDragOffset` → zéro re-render
- N'utiliser `setDragOffset`/`setSheetPos` qu'au touchend (pour la valeur de snap finale et le `translateY` baseline lors du prochain render)

Ça transformerait le drag en pur DOM manipulation (zéro coût React) jusqu'à la libération du doigt.

**Aucune modification n'a été effectuée.**
