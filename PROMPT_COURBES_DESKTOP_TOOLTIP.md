# PROMPT_COURBES_DESKTOP_TOOLTIP — Bulle desktop qui suit la souris

## Fichier modifié
- `src/app/activities/page.tsx` — composant `ActivityCurves`

## Détection desktop
```ts
const [isDesktop, setIsDesktop] = useState(false)
useEffect(() => {
  if (typeof window === 'undefined') return
  const mq = window.matchMedia('(hover: hover) and (pointer: fine)')
  const update = () => setIsDesktop(mq.matches)
  update()
  mq.addEventListener('change', update)
  return () => mq.removeEventListener('change', update)
}, [])
```
`(hover: hover) and (pointer: fine)` → vrai uniquement sur desktop avec souris.

## Refactor `updateAtClientX → updateAtPointer(clientX, clientY)`
Signature étendue pour recevoir aussi `clientY` (nécessaire pour positionner la bulle en `position: fixed` sur desktop). Tous les sites d'appel via `onPointerDown/Move` passent maintenant `e.clientX, e.clientY`.

Le bloc desktop ajouté en fin de fonction :
```ts
if (isDesktop && tooltipRef.current) {
  const bubble = tooltipRef.current
  const bw = bubble.offsetWidth
  const bh = bubble.offsetHeight
  let left = clientX + 12
  let top  = clientY + 12
  if (left + bw + 12 > window.innerWidth)  left = clientX - bw - 12
  if (top  + bh + 12 > window.innerHeight) top  = clientY - bh - 12
  left = Math.max(8, left)
  top  = Math.max(8, top)
  bubble.style.left = `${left}px`
  bubble.style.top  = `${top}px`
}
```
Basculement à gauche/au-dessus si proche du bord. Clamp minimum 8 px.

## Tooltip wrappers — position conditionnelle (fixed vs static)

### TooltipNeutral (Empilé + Superposé)
```ts
style={{
  opacity:       0,
  transition:    'opacity 0.15s',
  background:    'var(--bg-card)',
  border:        '1px solid var(--border)',
  borderRadius:  12,
  padding:       '10px 14px',
  boxShadow:     '0 4px 16px rgba(0,0,0,0.10)',
  pointerEvents: 'none',
  ...(isDesktop
    ? { position: 'fixed', left: -9999, top: -9999, zIndex: 1000 }
    : { position: 'static', marginBottom: 10 }
  ),
}}
```

### TooltipColored (Mono)
Idem, avec `background: monoBg, color: monoTxtClr` + padding `12px 16px` + shadow `0 4px 16px rgba(0,0,0,0.15)`.

## Bénéfices
- **Desktop** : bulle `position: fixed` qui suit la souris → ZÉRO espace réservé dans le flow (le gap de ~ 180 px diagnostiqué dans `PROMPT_COURBES_GAP_DIAGNOSTIC` disparaît côté desktop).
- **Mobile** : bulle `position: static` en flow au-dessus du chart → comportement strictement inchangé.
- `pointerEvents: 'none'` empêche la bulle d'intercepter les mousemove → pas de flicker.
- `zIndex: 1000` en fixed → la bulle passe au-dessus du sheet/sidebar/header.

## Pointer enter/leave
Pas besoin de handlers séparés `mouseenter/mouseleave`. `onPointerMove` couvre les 2 :
- Au 1er mousemove sur le chart → `updateAtPointer` fait apparaître la bulle (opacity 1 + repositionne)
- Au mouseleave → `onPointerLeave` appelle `hideHint()` (opacity 0)

## Inchangé
- Crosshair vertical + dots (même refs, même logique)
- Logique multi-format (Empilé / Superposé / Mono)
- Contenu de la bulle (multi-lignes neutre vs colorée mono) — strictement identique
- Mobile fixe en haut du chart — comportement préservé
- Aucun setState dans `updateAtPointer` ni `hideHint`

## Vérification
- `npm run build` : ✅ 0 erreur TS
- Desktop : bulle suit la souris, bascule au bord droit/bas, ZÉRO espace réservé dans le flow
- Mobile : bulle fixe en haut (comportement inchangé)
- Tous les formats : bulle colorée Mono / bulle neutre Empilé+Superposé
- Aucun re-render React pendant le hover (refs DOM directes)
