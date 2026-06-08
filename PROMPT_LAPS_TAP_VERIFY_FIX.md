# PROMPT_LAPS_TAP_VERIFY_FIX — Vérification + correctif tap barre lap

## Vérification systématique

### V1 — Prop `onLapTap` dans LapsBikeChart : **OK**
```
$ grep -n "onLapTap" src/components/activity/LapsBikeChart.tsx
28:  onLapTap?:    (lapIndex: number) => void
75:export function LapsBikeChart({ activityId, cachedLaps, avgWatts, ftp, onLapTap }: Props) {
234:              onClick={() => onLapTap?.(i)}
235:              onTouchEnd={() => onLapTap?.(i)}
238:              style={{ cursor: onLapTap ? 'pointer' : 'default' }}
```

### V2 — onClick branché sur les barres : **OK (mais sur `<g>`, à risque)**
Le handler `onClick + onTouchEnd` était sur le `<g>` parent. Les events SVG sur `<g>` ne sont pas toujours capturés correctement, notamment sur certains browsers tactiles (iOS Safari notamment).

### V3 — Pointer-events : **PIÈGE TROUVÉ**
Aucun `pointer-events: none` n'était set. Mais le `<rect>` visible de la barre est rendu APRÈS la hit area transparente : il absorbe le click au-dessus de la barre. Quand on tape sur la zone basse (sous la barre), la hit area est touchée — quand on tape sur la barre elle-même, c'est le rect visible qui reçoit l'event, et la propagation au parent `<g>` peut échouer selon le browser.

### V4 — Branchement `activities/page.tsx` : **OK**
```
$ grep -n "LapsBikeChart\|lapsViewOpen\|setLapsViewInitial" src/app/activities/page.tsx
25:  import { LapsBikeChart } from '@/components/activity/LapsBikeChart'
26:  import { LapsDetailView } from '@/components/activity/LapsDetailView'
6523: const [lapsViewOpen,    setLapsViewOpen]    = useState(false)
6524: const [lapsViewInitial, setLapsViewInitial] = useState(0)
7362: onLapTap={i => { setLapsViewInitial(i); setLapsViewOpen(true) }}     // mobile
7851: onLapTap={i => { setLapsViewInitial(i); setLapsViewOpen(true) }}     // desktop
```
Les 2 call sites passent bien `onLapTap` et la state est correctement déclarée.

### V5 — `LapsDetailView` rendu conditionnellement : **OK**
```
7972: <LapsDetailView
7973:   open={lapsViewOpen}
7974:   onClose={() => setLapsViewOpen(false)}
...
```
`open={lapsViewOpen}` — le composant retourne `null` si `!open`, sinon portalise et anime.

### V6 — Bouton "Voir tous les tours" : **OK fonctionnel**
Le bouton `Voir tous les tours ›` ouvrait déjà la vue correctement avant ce fix, ce qui isole la cause au **branchement du tap sur les barres uniquement** (le state + la vue marchent).

## Cause racine identifiée

Les handlers `onClick` + `onTouchEnd` étaient placés sur le **`<g>` parent**. Dans SVG, les events click/touch tirés sur des enfants peuvent ne pas bubble fiabilement au parent `<g>` selon le browser :
- Sur **iOS Safari**, `<g>` n'est pas toujours pickable au tactile.
- Le **`<rect>` visible de la barre** absorbe l'event sans pouvoir le relayer.

## Correctif appliqué

### Déplacement des handlers sur la `<rect>` hit area + ajout `pointerEvents`

Avant :
```tsx
<g onClick={...} onTouchEnd={...} style={{cursor: ...}}>
  <rect /* hit area */ fill="transparent" />
  <rect /* bar */ />
  <text ... /> <text ... />
</g>
```

Après :
```tsx
<g onMouseEnter={...} onMouseLeave={...}>
  {/* Hit area : porte les 3 handlers (click, touch, pointer) */}
  <rect
    x={bX} y={PAD_T} width={bW + GAP} height={CH}
    fill="transparent"
    onClick={() => onLapTap?.(i)}
    onTouchEnd={e => { e.preventDefault(); onLapTap?.(i) }}
    onPointerUp={e => { if (e.pointerType === 'mouse') return; onLapTap?.(i) }}
    style={{ cursor: onLapTap ? 'pointer' : 'default', pointerEvents: 'all' }}
  />
  {/* Bar visuelle : ignore les events → laisse passer vers la hit area */}
  <rect … style={{ transition: 'fill 0.15s', pointerEvents: 'none' }} />
  {/* Labels watts + tick : également pointerEvents:none */}
  <text … style={{ ..., pointerEvents: 'none' }} />
  <text … style={{ ..., pointerEvents: 'none' }} />
</g>
```

### Pourquoi ça fix

1. **Hit area au-dessus de tout en z-stack… non, en-dessous** : elle est rendue EN PREMIER mais avec `pointerEvents: 'all'` et tous les enfants ultérieurs `pointerEvents: 'none'`, le navigateur résout le hit en remontant depuis le top : visible bar → none → text → none → hit area → `onClick`. La hit area capture sans ambigüité.
2. **`onPointerUp` unifié** : couvre les browsers récents (Pointer Events spec) où les touch peuvent ne pas remonter en TouchEvents.
3. **`e.preventDefault()` sur `onTouchEnd`** : empêche le double-fire avec onClick sur iOS (300 ms tap delay).
4. **`if (e.pointerType === 'mouse') return` sur onPointerUp** : évite le double-fire sur desktop où onClick fire AUSSI sur souris.

### Préfixe "T" : déjà supprimé
Vérifié l. 281 : `{i + 1}` (sans préfixe). Cohérent avec `LapsDetailView`.

## Vérification doublons
```
$ grep -rn "selectedLap|setSelectedLap|LapDetailPanel" src/
```
LapsBikeChart : 0 match ✅
SyncCharts (dead code, orphelin) : 4 matches inchangés — sans rapport.

## Vérification fonctionnelle
- ✅ `npm run build` exit 0
- ✅ Tap sur une barre (mobile + desktop) → `LapsDetailView` s'ouvre, lap actif = lap tapé
- ✅ Bouton "Voir tous les tours ›" → ouvre avec lap 0
- ✅ Back ‹ dans la vue → fermeture animée
- ✅ Plus de carte inline sous le graphique
- ✅ Mode jour + nuit OK
