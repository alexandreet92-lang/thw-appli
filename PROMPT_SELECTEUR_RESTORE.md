# PROMPT_SELECTEUR_RESTORE — Drag-to-select restauré dans ActivityCurves

## Fichier modifié
- `src/app/activities/page.tsx` — composant `ActivityCurves`

## Approche
**Option 1 retenue** : porter le drag-to-select dans `ActivityCurves`, réutiliser tel quel `SelectionSheet` (l. 1771-2058) qui était déjà robuste et portalisé.

`SyncCharts` reste dead code (sera nettoyé dans un commit séparé). Les animations CSS `selSheet*` ne sont pas touchées.

## API de SelectionSheet (rappel)
```ts
interface SelectionSheetProps {
  sel:         [number, number]  // tuple [startIdx, endIdx]
  time:        number[]
  distance:    number[] | null
  watts:       number[] | null
  hr:          number[] | null
  velocity:    number[] | null
  alt:         number[] | null
  cadence:     number[] | null
  temp:        number[] | null
  ftp:         number | null
  hrZones?:    ParsedZone[]      // optionnel (non passé pour l'instant)
  onClose:     () => void
}
```

Composant déjà portalisé via `createPortal(sheetNode, document.body)` (l. 1911-1913) → s'extrait des containing blocks transformés.

## Implémentation

### 1. State + refs
```ts
const [selection,    setSelection]    = useState<[number, number] | null>(null)
const [showSelModal, setShowSelModal] = useState(false)
const isSelectingRef  = useRef(false)
const dragStartIdxRef = useRef<number | null>(null)
```

### 2. Helper de conversion clientX → idx
```ts
function idxFromClientX(clientX: number): number {
  const cont = containerRef.current
  if (!cont) return 0
  const rect = cont.getBoundingClientRect()
  const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
  return Math.round(ratio * (N - 1))
}
```

### 3. Handlers PointerEvents étendus (desktop uniquement)
```ts
function onPointerDown(e) {
  // Desktop click gauche → drag-to-select
  if (isDesktop && e.pointerType === 'mouse' && e.button === 0) {
    isSelectingRef.current = true
    const idx = idxFromClientX(e.clientX)
    dragStartIdxRef.current = idx
    setSelection([idx, idx])
    setShowSelModal(false)
    hideHint()                                  // pas de crosshair pendant la sélection
    e.currentTarget.setPointerCapture(e.pointerId)
    return
  }
  updateAtPointer(e.clientX, e.clientY)         // path normal hover/touch
  if (e.pointerType !== 'mouse') e.currentTarget.setPointerCapture(e.pointerId)
}

function onPointerMove(e) {
  if (isSelectingRef.current) {                 // étend la sélection, pas de tooltip
    const idx = idxFromClientX(e.clientX)
    const start = dragStartIdxRef.current ?? idx
    setSelection([Math.min(start, idx), Math.max(start, idx)])
    return
  }
  updateAtPointer(e.clientX, e.clientY)
}

function onPointerLeaveOrUp() {
  if (isSelectingRef.current) {
    isSelectingRef.current = false
    dragStartIdxRef.current = null
    setSelection(cur => {
      if (cur && cur[1] - cur[0] > 5) {        // seuil ~ 5 indices
        setShowSelModal(true)
        return cur
      }
      return null
    })
  }
  hideHint()
}
```

### 4. Overlay rectangulaire indigo
```tsx
const SelectionOverlay = selection && N > 1 ? (
  <div style={{
    position: 'absolute', top: 0, bottom: 0,
    left:  `${(selection[0] / (N - 1)) * 100}%`,
    width: `${((selection[1] - selection[0]) / (N - 1)) * 100}%`,
    background:    'rgba(99, 102, 241, 0.15)',
    borderLeft:    '1px solid #6366f1',
    borderRight:   '1px solid #6366f1',
    pointerEvents: 'none',
    zIndex:        4,
  }} />
) : null
```

Inséré dans :
- **Empilé** : à l'intérieur de la colonne charts (`flex: 1, position: relative`)
- **Superposé** : à l'intérieur du wrapper chart
- **Mono** : à l'intérieur du wrapper chart

### 5. Render de SelectionSheet
```tsx
const SelSheetNode =
  showSelModal && selection && series
    ? (
      <SelectionSheet
        sel={selection}
        time={series.time ?? []}
        distance={series.distance ?? null}
        watts={series.watts ?? null}
        hr={series.hr ?? null}
        velocity={s?.velocity ?? null}        // velocity m/s brute (SelectionSheet *3.6 lui-même)
        alt={series.altitude ?? null}
        cadence={series.cadence ?? null}
        temp={series.temp ?? null}
        ftp={activity.ftp_at_time ?? null}
        onClose={() => {
          setShowSelModal(false)
          setSelection(null)
        }}
      />
    )
    : null
```

Inséré à la fin de chaque format (`{SelSheetNode}` après les labels axe X).

## Comportement
- **Desktop click + drag** : overlay indigo apparaît, suit le drag. Au relâchement, si plage > 5 indices, `SelectionSheet` s'ouvre.
- **Desktop click court (≤ 5 indices)** : reset, pas de sheet.
- **Hover desktop seul (sans bouton)** : crosshair + tooltip s'affichent normalement.
- **Pendant le drag** : `hideHint()` masque crosshair + dots + tooltip → pas de double feedback visuel.
- **Mobile (touch)** : `isDesktop === false` → le drag-to-select est NE PAS activé. Comportement scrub/crosshair tactile inchangé.
- **Persistance entre formats** : changer de format avec une sélection active conserve `selection` (state au niveau ActivityCurves) → l'overlay réapparaît dans le nouveau format.
- **Close sheet** : `onClose` reset à la fois `showSelModal` et `selection` → l'overlay disparaît aussi.

## Inchangé
- `SelectionSheet` (l. 1771-2058) — strictement aucune modification
- Animations CSS `selSheet*` (l. 2330-2333) — non touchées
- `SyncCharts` (l. 2064-2652) — reste en dead code
- Tooltip / crosshair / dots de hover — comportement intact (seul le drag-to-select s'ajoute)
- Mobile — strictement aucune régression (le `if (isDesktop ...)` gate le drag-to-select)

## Vérification
- ✅ `npm run build` exit 0
- ✅ 3 formats supportent le drag : Empilé, Superposé, Mono
- ✅ Overlay indigo `rgba(99, 102, 241, 0.15)` + bordures `#6366f1`
- ✅ SelectionSheet portalisé sur `document.body` → s'affiche en plein écran sans containing-block issue
- ✅ Crosshair masqué pendant le drag (via `hideHint()` au pointerdown)
- ✅ Mobile : `if (isDesktop && pointerType === 'mouse')` → drag désactivé, comportement actuel préservé
