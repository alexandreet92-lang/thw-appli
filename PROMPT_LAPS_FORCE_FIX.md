# PROMPT_LAPS_FORCE_FIX — Diagnostic forcé + suppression bouton

## Modifications par fichier

### `src/components/activity/LapsBikeChart.tsx`
**Étape 1** : conservé tout ce que les fixes précédents avaient fait (prop `onLapTap`, handler sur hit area, `pointerEvents: none` sur la barre et les labels, préfixe "T" supprimé).

**Ajout** : logs diagnostiques `[LAPS-FORCE]` sur les 3 handlers + `e.stopPropagation()` sur onClick :
```tsx
onClick={e => {
  e.stopPropagation()
  console.log('[LAPS-FORCE] Barre cliquée index:', i, 'callback définie?', !!onLapTap)
  onLapTap?.(i)
}}
onTouchEnd={e => {
  e.preventDefault()
  e.stopPropagation()
  console.log('[LAPS-FORCE] Barre touchée index:', i)
  onLapTap?.(i)
}}
onPointerUp={e => {
  if (e.pointerType === 'mouse') return  // évite double-fire avec onClick desktop
  console.log('[LAPS-FORCE] Barre pointerUp index:', i, 'type:', e.pointerType)
  onLapTap?.(i)
}}
```

Le `e.stopPropagation()` empêche tout parent (Section, BottomSheet) d'intercepter et de neutraliser le click. Bug potentiel quand le composant est dans un `BottomSheet` qui pourrait swiper.

### `src/app/activities/page.tsx`

**Ajout** : log diagnostique dans la callback aux 2 call sites (mobile + desktop) :
```tsx
onLapTap={i => {
  console.log('[LAPS-FORCE] Callback page reçue, ouvre la vue pour lap', i)
  setLapsViewInitial(i)
  setLapsViewOpen(true)
}}
```

**SUPPRESSION** : les 2 boutons "Voir tous les tours ›" (mobile + desktop). Vérifié `grep -rn "Voir tous les tours" src/` → **0 match**. Le seul point d'entrée vers la vue est désormais le tap sur une barre.

### `src/components/activity/LapsDetailView.tsx`

**Ajout** : log diagnostique au render (pas dans un useEffect — voulu pour tracer chaque render) :
```ts
console.log('[LAPS-FORCE] LapsDetailView render, props:', {
  open, initialActiveLap,
  lapsCount: laps?.length ?? 0,
  hasStreams: !!streams,
  hasAltitude: !!streams?.altitude,
})
```

Le composant retourne `null` si `!open || typeof document === 'undefined'`. Les hooks (useState, useEffect, useMemo) sont AVANT cette ligne — ordre React respecté.

## Comportement attendu après ce fix

Au tap sur une barre, la console devrait montrer dans l'ordre :
1. `[LAPS-FORCE] Barre cliquée index: X, callback définie? true`
2. `[LAPS-FORCE] Callback page reçue, ouvre la vue pour lap X`
3. `[LAPS-FORCE] LapsDetailView render, props: { open: true, initialActiveLap: X, ... }`

Si l'utilisateur voit `[LAPS-FORCE] Barre cliquée` mais pas la suite → callback non câblée (impossible vu le code actuel)
Si l'utilisateur voit (1) + (2) mais pas (3) → composant non monté (vérifier import)
Si l'utilisateur voit (1) + (2) + (3) mais pas de visuel → CSS/transformations parent (containing block transformé) — mais le composant utilise `createPortal(node, document.body)` donc il s'en extrait.

## Inchangé
- Tout le rendu visuel du LapsBikeChart : barres, axes, ligne moyenne, labels watts
- Hooks de `LapsDetailView` (ordre respecté)
- `LapDetailsSheet` (Niveau 2) interne à `LapsDetailView`
- `GaugeEditModal`, `SelectionSheet`, etc.

## Vérification
- ✅ `npm run build` exit 0
- ✅ `grep "Voir tous les tours" src/` → 0 match
- ✅ Logs `[LAPS-FORCE]` ajoutés à 3 endroits : LapsBikeChart, activities/page.tsx, LapsDetailView
- ✅ Handlers sur hit area `<rect>` (pointer-events all) avec `e.stopPropagation()` pour éviter toute interception parent
- ✅ Préfixe "T" supprimé (cohérent avec LapsDetailView)
