# PROMPT_SHEET_DRAGGABLE — Drag tactile du sheet sur la handle

## Avertissement respecté
Implémentation cumulative SUR les commits A (`15e2882`, DOM sticky) et B (`0868f41`, scroll-zoom). Ce commit C ajoute le drag — si quelque chose casse, `git revert` ce seul commit rétablit l'état des étapes 1+2+3.

Le scroll-zoom existant n'est PAS retiré : on le **fusionne** avec le zoom-par-position-du-sheet pour qu'ils coopèrent (le scale appliqué au `.leaflet-container` est `max(scrollScale, sheetScale)`).

## 3 positions (snap points)
Référentiel : offset = `translateY` appliqué au sheet par rapport à sa position naturelle (qui équivaut à « default »).

| Position | Offset | Effet visuel |
|---|---|---|
| `collapsed` | `+25vh` | Sheet descend, map prend ~80vh — titre + sport·date encore visibles |
| `default` (init) | `0` | État au mount — map 60vh + sheet visible dès ~60vh |
| `expanded` | `-42vh` | Sheet remonté, map réduite à ~18-20vh — titre, stats, records visibles d'emblée |

(Les vh sont calculés à partir de `windowH` — recalculés au resize.)

## Fichiers modifiés
- `src/app/activities/page.tsx` (state + refs + handlers + JSX sheet)
- `src/app/globals.css` (1 paire de règles pour transition on/off)

## Implémentation

### CSS additions
```css
.thw-activity-sheet {
  transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  will-change: transform;
  touch-action: pan-y;       /* le contenu peut scroller verticalement */
}
.thw-activity-sheet.dragging { transition: none; }
.thw-activity-sheet-handle {
  touch-action: none;        /* intercepte le geste sur la handle */
  cursor: grab;
}
.thw-activity-sheet-handle:active { cursor: grabbing; }
```

### State + refs (mobile uniquement)
```ts
const [sheetPos, setSheetPos] = useState<'collapsed'|'default'|'expanded'>('default')
const [dragOffset, setDragOffset] = useState(0)
const [isDragging, setIsDragging] = useState(false)
const [winH, setWinH] = useState(() => typeof window !== 'undefined' ? window.innerHeight : 800)
const dragStartY = useRef(0)
const dragStartOffset = useRef(0)
const sheetScaleRef = useRef(1)  // partagé avec le scroll-zoom

function getOffsetForPos(pos: 'collapsed'|'default'|'expanded'): number {
  if (pos === 'collapsed') return winH * 0.25
  if (pos === 'expanded')  return -winH * 0.42
  return 0
}

const baseOffset = getOffsetForPos(sheetPos)
const currentOffset = isDragging ? dragOffset : baseOffset
```

### Resize listener
Recompose les offsets si la fenêtre est redimensionnée :
```ts
useEffect(() => {
  if (typeof window === 'undefined') return
  const onResize = () => setWinH(window.innerHeight)
  window.addEventListener('resize', onResize)
  return () => window.removeEventListener('resize', onResize)
}, [])
```

### Handlers touch (sur la handle uniquement)
```ts
const onTouchStart = (e: React.TouchEvent) => {
  setIsDragging(true)
  dragStartY.current = e.touches[0].clientY
  dragStartOffset.current = baseOffset
  setDragOffset(baseOffset)
}
const onTouchMove = (e: React.TouchEvent) => {
  if (!isDragging) return
  const delta = e.touches[0].clientY - dragStartY.current
  const newOffset = dragStartOffset.current + delta
  const minOffset = -winH * 0.42  // expanded max
  const maxOffset =  winH * 0.25  // collapsed max
  setDragOffset(Math.max(minOffset, Math.min(maxOffset, newOffset)))
}
const onTouchEnd = () => {
  if (!isDragging) return
  setIsDragging(false)
  const positions = [
    { pos: 'collapsed' as const, val: winH * 0.25 },
    { pos: 'default'   as const, val: 0 },
    { pos: 'expanded'  as const, val: -winH * 0.42 },
  ]
  const nearest = positions.reduce((best, curr) =>
    Math.abs(curr.val - dragOffset) < Math.abs(best.val - dragOffset) ? curr : best,
  )
  setSheetPos(nearest.pos)
  setDragOffset(nearest.val)
}
```

### Fusion avec le scroll-zoom existant
Le ref `sheetScaleRef.current` est mis à jour quand `sheetPos` change. Le scroll handler lit ce ref et calcule le scale final = `max(scrollScale, sheetScaleRef.current)`. Plus de conflit.

```ts
useEffect(() => {
  const newScale = sheetPos === 'expanded' ? 1.15
                 : sheetPos === 'default'  ? 1.08
                 : 1.0
  sheetScaleRef.current = newScale
  // Apply directement avec transition 0.25s pour le snap visuel
  const mapEl = mobileMapRef.current
  if (!mapEl) return
  const leaflet = mapEl.querySelector('.leaflet-container') as HTMLElement | null
  if (!leaflet) return
  leaflet.style.transformOrigin = 'center center'
  leaflet.style.transition      = 'transform 0.25s cubic-bezier(0.4, 0, 0.2, 1)'
  leaflet.style.transform       = `scale(${newScale})`
}, [sheetPos])
```

Le scroll handler existant garde sa propre transition 0.1s linear et compose avec le ref :
```ts
// inside scroll RAF handler (commit B):
const scrollScale = 1 + progress * 0.15
const finalScale = Math.max(scrollScale, sheetScaleRef.current)
leaflet.style.transition = 'transform 0.1s linear'
leaflet.style.transform = `scale(${finalScale})`
```

### JSX sheet — touch handlers sur la handle uniquement
```tsx
<div
  data-bottom-sheet=""
  className={`thw-activity-sheet${isDragging ? ' dragging' : ''}`}
  style={{
    /* …styles inline existants… */
    transform: `translateY(${currentOffset}px)`,
  }}
>
  <div
    className="thw-activity-sheet-handle"
    onTouchStart={onTouchStart}
    onTouchMove={onTouchMove}
    onTouchEnd={onTouchEnd}
    onTouchCancel={onTouchEnd}
    style={{ display:'flex', justifyContent:'center', padding:'12px 0 8px' }}
  >
    <div style={{ width:40, height:4, borderRadius:2, backgroundColor:'var(--info-border)' }} />
  </div>
  {/* contenu sheet inchangé : titre, sport·date, stats, records, AI, sections, courbes, laps */}
</div>
```

### Garde-fous
- `if (window.innerWidth >= 768) return` dans les useEffects → desktop intouché
- `mobileMapRef.current` null check → pas de crash si pas monté
- `.leaflet-container` null check dans les 2 effets (scroll + sheetPos)
- `dragOffset` clampé entre min/max
- `requestAnimationFrame` + `passive: true` pour le scroll → fluide
- `touchAction: none` sur la handle, `pan-y` sur le sheet → scroll interne préservé

## Pourquoi rien ne casse
- ❌ Pas de `position: fixed` (problème containing block)
- ❌ Pas de `createPortal` (problème scroll container)
- ✅ Le sheet reste `position: relative` dans le flux normal
- ✅ Le `transform: translateY` ne crée PAS de containing block pour la map sticky (la map sticky est dans un AUTRE conteneur, sticky est indépendant)
- ✅ Tout le contenu sheet reste accessible (juste shifté visuellement)
- ✅ Le scroll natif du sheet (pan-y) marche encore — il faut juste descendre le doigt dans le contenu, pas sur la handle

## Vérification
- npm run build : ✅ 0 erreur
- Mobile attendu :
  - Ouverture → position `default`, titre/sport/date/début stats visibles
  - Drag handle vers le bas → snap `collapsed`, map ~80vh
  - Drag handle vers le haut → snap `expanded`, map ~18vh
  - Scroll dans le contenu → fonctionne normalement (pan-y)
  - Map zoom synchronisé : 1.0 collapsed → 1.08 default → 1.15 expanded, plus scroll-progressif jusqu'à 1.15 max
  - Bouton retour visible et fonctionnel
- Desktop : strictement intouché (early-return useEffects + branche desktop séparée)
