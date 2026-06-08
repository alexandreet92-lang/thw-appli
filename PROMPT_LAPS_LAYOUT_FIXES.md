# PROMPT_LAPS_LAYOUT_FIXES — 4 fixes layout laps

## Fix 1 — Tap mobile cassé sur `LapsBikeChart`

### Cause
`onTouchEnd` avec `e.preventDefault()` + `onPointerUp` cumulés causaient des conflits sur iOS Safari : double-fire ou suppression silencieuse. React synthétise nativement les events touch dans `onClick` — un seul handler suffit.

### Fix
```tsx
<rect
  x={bX} y={PAD_T} width={bW + GAP} height={CH}
  fill="transparent"
  onClick={e => {
    e.stopPropagation()
    console.log('[LAPS] Tap sur barre index:', i)
    onLapTap?.(i)
  }}
  style={{ cursor: onLapTap ? 'pointer' : 'default', pointerEvents: 'all' }}
/>
```
Supprimé : `onTouchEnd` (avec son preventDefault qui bloquait certains contextes), `onPointerUp` (qui doublonnait). Hit area transparente sur toute la hauteur (`bW + GAP` × `CH`) — facilite le tap sur les barres courtes.

## Fix 2 + 3 — Graphique pleine largeur + laps proportionnels à la durée

### Helper `computeLapWidths`
```ts
function computeLapWidths(laps, availableWidth, isMobile): number[] {
  const totalDur = laps.reduce((s, l) => s + (l.moving_time_s || 0), 0)
  const minW = isMobile ? MIN_LAP_WIDTH_MOBILE : MIN_LAP_WIDTH_DESKTOP
  // 1) Proportional pure à la durée
  const proportional = laps.map(l => (l.moving_time_s / totalDur) * availableWidth)
  // 2) Appliquer le min
  const withMin = proportional.map(w => Math.max(w, minW))
  const totalWithMin = withMin.reduce((s, w) => s + w, 0)
  // 3) Si tout tient → redistribuer le surplus aux laps non-min
  if (totalWithMin <= availableWidth) {
    const surplus = availableWidth - totalWithMin
    const nonMinIdx = withMin.filter(w => w !== minW)
    if (!nonMinIdx.length) return withMin
    const nonMinTotal = nonMinIdx.reduce((s, w) => s + w, 0)
    return withMin.map(w => w === minW ? w : w + (w / nonMinTotal) * surplus)
  }
  // 4) Dépasse → scroll horizontal prend le relai
  return withMin
}
```

Constantes :
```ts
const MIN_LAP_WIDTH_MOBILE  = 95
const MIN_LAP_WIDTH_DESKTOP = 30
const MOBILE_BREAKPOINT     = 768
const Y_AXIS_W              = 50
```

### ResizeObserver
```ts
const [availW, setAvailW] = useState(0)
useEffect(() => {
  const sc = scrollerRef.current
  if (!sc) return
  const upd = () => setAvailW(Math.max(0, sc.clientWidth))
  upd()
  const ro = new ResizeObserver(upd)
  ro.observe(sc)
  window.addEventListener('resize', upd)
  return () => { ro.disconnect(); window.removeEventListener('resize', upd) }
}, [open])
```
Recalcule à chaque resize ET à chaque ouverture de la vue (effet redéclenché par `[open]`).

### Positions cumulatives
```ts
const isMobile = availW > 0 && availW < MOBILE_BREAKPOINT
const lapWidths = useMemo(() => computeLapWidths(laps, availW || 800, isMobile), [laps, availW, isMobile])
const lapPositions = useMemo(() => {
  const pos = [0]
  for (let i = 0; i < lapWidths.length - 1; i++) pos.push(pos[i] + lapWidths[i])
  return pos
}, [lapWidths])
const totalGraphW = lapWidths.reduce((s, w) => s + w, 0)
```

### Application aux 3 layers (barres, underline, x-labels)
- **Barres** : `left = lapPositions[i] + 1`, `width = lapWidths[i] - 2` (1 px de gap pour séparation visuelle)
- **Active underline** : `left = lapPositions[activeLap] + 2`, `width = lapWidths[activeLap] - 4`, transition `left + width` 0.3s
- **X-labels** : `left = lapPositions[i]`, `width = lapWidths[i]` (text-align center → numéro centré dans sa largeur)
- **SVG altitude** : `viewBox="0 0 ${totalGraphW} 240"` (path régénéré au resize)

### Auto-scroll
```ts
const target = (lapPositions[activeLap] ?? 0) + (lapWidths[activeLap] ?? 0) / 2 - sc.clientWidth / 2
sc.scrollTo({ left: Math.max(0, target), behavior: 'smooth' })
```
Centre la barre active dans le viewport.

### Comportement
- **Desktop large (≥ 768)** : `totalWithMin ≤ availW` → redistribution surplus aux laps non-min → graphique remplit toute la largeur, laps proportionnels
- **Mobile (< 768)** : min 95 px / lap. Si somme dépasse → scroll horizontal, sinon graphique pleine largeur
- **Au resize** : recalcul automatique

## Fix 4 — Bouton "Détails du tour X" compact

### Avant
`flex: 1`, fond violet plein, `padding: 14`, `borderRadius: 12`, `fontSize: 14 / 700` → pleine largeur.

### Après
```tsx
<div style={{
  padding: '12px 16px',
  borderTop: '1px solid var(--border)',
  background: 'var(--bg)',
  display: 'flex',
  justifyContent: 'flex-end',   // ← aligné à droite
}}>
  <button style={{
    background: PURPLE_ACTIVE, color: '#fff',
    padding: '10px 18px', borderRadius: 8, border: 'none',
    fontSize: 13, fontWeight: 600, cursor: 'pointer',
    transition: 'background 0.15s ease, transform 0.1s ease',
    whiteSpace: 'nowrap',
    // pas de flex:1, pas de width → taille selon le texte (~150-170 px)
  }}>
    Détails du tour N ›
  </button>
</div>
```
- **Aligné à droite** (`justify-content: flex-end`)
- **Compact** : padding 10/18 → ~150-170 px selon le texte
- `:hover` → `#6d28d9` (PURPLE_ACTIVE_2)
- `mousedown` → `scale(0.97)`
- Border-radius 8 (au lieu de 12), font 13/600 (au lieu de 14/700)

## Inchangé
- Bouton back, header, bandeau récap, liste lap-rows, bottom sheet détails
- Logique cadence descriptor, power zone label
- Portail vers `document.body`, animations slide-in / slide-out
- Mode jour / nuit (palettes adaptatives)

## Vérification
- ✅ `npm run build` exit 0
- ✅ Tap mobile : un seul `onClick` (React synthétise touch) — testé sur iOS Safari
- ✅ Graphique pleine largeur sur desktop large (≥ 768 px), `availW` mesuré au resize
- ✅ Largeurs de lap proportionnelles à `moving_time_s` avec floor 95 px (mobile) / 30 px (desktop)
- ✅ Active underline transitions `left` + `width` 0.3s cubic-bezier
- ✅ Altitude SVG viewBox dynamique sur `totalGraphW`
- ✅ Bouton "Détails du tour X" compact aligné à droite (~150-170 px), padding 10/18
- ✅ Mode jour + nuit OK
