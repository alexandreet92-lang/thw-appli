# PROMPT_TOOLTIP_DESKTOP_DIAGNOSTIC — Bulle ne s'affiche pas sur desktop

**Mode : lecture seule. Aucune modification de code.**

---

## Q1 — DÉTECTION DESKTOP

**Fichier :** `src/app/activities/page.tsx` (l. 2727-2740)

```tsx
const [isDesktop, setIsDesktop] = useState(false)
useEffect(() => {
  if (typeof window === 'undefined') return
  const mq = window.matchMedia('(hover: hover) and (pointer: fine)')
  const update = () => setIsDesktop(mq.matches)
  update()
  if (mq.addEventListener) mq.addEventListener('change', update)
  else mq.addListener(update)
  return () => {
    if (mq.removeEventListener) mq.removeEventListener('change', update)
    else mq.removeListener(update)
  }
}, [])
```

- **`isDesktop` au mount initial : `false`** (valeur de `useState(false)`)
- Sur desktop, **après le premier render**, `useEffect` s'exécute → `update()` met `isDesktop = true` → 2e render.
- **Risque SSR/hydratation** : oui, le premier render côté serveur ET côté client a `isDesktop = false`. Le tooltip est rendu une 1re fois avec les styles « mobile » (`position: static, marginBottom: 10`). Au 2e render (post-useEffect), il bascule à `position: fixed`.

**Consommation** :
- Spread conditionnel dans les styles de `TooltipNeutral` (l. 2997) et `TooltipColored` (l. 3045) → recalculé à chaque render.
- Test dans `updateAtPointer` (l. 2895) → si `isDesktop && tooltipRef.current` : repositionne la bulle en fixed.

---

## Q2 — TOOLTIP RENDU

### TooltipNeutral (l. 2978-3024)
```tsx
const TooltipNeutral = (
  <div
    ref={tooltipRef}
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
        ? { position: 'fixed' as const, left: -9999, top: -9999, zIndex: 1000, marginBottom: 0 }
        : { position: 'static' as const, marginBottom: 10 }
      ),
    }}
  >
    <div ref={tooltipHeaderRef} style={{ ... }}>—</div>
    {tooltipNeutralKeys.map(key => { … }) }
  </div>
)
```

### TooltipColored (l. 3026-3057) — Mono
Identique mais background = couleur métrique, padding `12px 16px`.

**Rendu** :
- **Inconditionnel** dans chaque branche format (`{TooltipNeutral}` ou `{TooltipColored}` est dans le JSX directement)
- `tooltipRef` toujours attaché
- Sur desktop : initial `left: -9999, top: -9999` → la bulle est hors écran tant que `updateAtPointer` n'a pas été appelé

**Dans l'inspecteur**, on devrait trouver UN `<div>` avec opacity 0, position fixed, left -9999px, top -9999px, zIndex 1000.

---

## Q3 — HANDLERS ATTACHÉS

### Wrapper Empilé (l. 3099-3112)
```tsx
<div
  ref={containerRef}
  onPointerDown={onPointerDown}
  onPointerMove={onPointerMove}
  onPointerUp={onPointerLeaveOrUp}
  onPointerLeave={onPointerLeaveOrUp}
  onPointerCancel={onPointerLeaveOrUp}
  style={{ display: 'flex', position: 'relative', background: 'var(--bg-card2)', borderRadius: 10, overflow: 'hidden', touchAction: 'none', cursor: 'crosshair' }}
>
```

### Wrapper Superposé (l. ~3250-3265) et Mono (l. ~3285-3300)
Identique : `onPointerDown / Move / Up / Leave / Cancel`.

**⚠️ AUCUN `onMouseMove` / `onMouseEnter` / `onMouseLeave`** : l'implémentation utilise des **PointerEvents** unifiés (couvrent touch + mouse en théorie).

**Sur Empilé** : les handlers sont sur le **wrapper global** (qui contient label-column + chart-column) → le mousemove se déclenche partout dans la zone, y compris au survol de la colonne label gauche.

---

## Q4 — HANDLER POINTER MOVE

```tsx
function onPointerMove(e: React.PointerEvent) {
  updateAtPointer(e.clientX, e.clientY)
}
```

Pas d'early return — `updateAtPointer` est appelé inconditionnellement.

Dans `updateAtPointer(clientX, clientY)` (l. 2841-2908) :
- Calcule `ratio` et `idx` depuis `containerRef.current.getBoundingClientRect()`
- Met à jour crosshair, dots, valeurs du tooltip via refs
- **L. 2893** : `tooltipRef.current.style.opacity = '1'` — exécuté pour TOUS les pointer events
- **L. 2895-2907** : si `isDesktop && tooltipRef.current` → repositionne `bubble.style.left/top`

**L'opacity est gérée DANS le mousemove**, pas dans un mouseenter dédié.

**Hide** (`hideHint`, l. 2910-2914) — appelé par `onPointerLeaveOrUp` :
```tsx
function hideHint() {
  if (crosshairRef.current) crosshairRef.current.style.opacity = '0'
  dotRefsMap.current.forEach(dot => { if (dot) dot.style.opacity = '0' })
  if (tooltipRef.current) tooltipRef.current.style.opacity = '0'
}
```

---

## Q5 — POSITION INITIALE

Style initial du tooltip sur desktop :
```ts
{
  position: 'fixed',
  left: -9999,
  top: -9999,
  zIndex: 1000,
  marginBottom: 0,
  opacity: 0,
  pointerEvents: 'none',
  transition: 'opacity 0.15s',
  ...
}
```

- `position: fixed` — **CRITIQUE** : ne fonctionne que si AUCUN ancêtre n'a `transform`, `filter`, `perspective`, `will-change: transform`, ou `contain` non-`none`. Sinon le containing block du fixed devient cet ancêtre, pas le viewport.
- `left: -9999, top: -9999` — hors écran tant que pas repositionné
- `z-index: 1000` — au-dessus de la plupart des UIs
- `pointer-events: none` — la bulle n'intercepte pas le mousemove sous-jacent

---

## Q6 — DOUBLE TOOLTIP

**Non, un seul tooltip à la fois** :
- Format Empilé : `{TooltipNeutral}` rendu
- Format Superposé : `{TooltipNeutral}` rendu
- Format Mono : `{TooltipColored}` rendu

`tooltipRef` n'est attaché qu'une seule fois par render (au tooltip du format courant). Pas de coexistence mobile + desktop ; le MÊME composant gère les deux modes via le spread conditionnel `isDesktop ? {…fixed…} : {…static…}`.

**Pas de DesktopTooltip / MobileTooltip séparés** (option A du prompt initial PAS suivie ; le code utilise un seul composant qui s'adapte — option B).

---

## Q7 — ERREURS CONSOLE

`npm run build` exit 0 — aucune erreur TypeScript.

À runtime, erreurs possibles à vérifier dans la console navigateur :
- Warning React sur les `style` typés (le spread `as const` peut prêter à confusion mais devrait passer)
- Aucune erreur attendue à l'analyse statique

---

## Q8 — COMPORTEMENT OBSERVÉ

Le prompt utilisateur indique :
- Crosshair : **probablement OK** (même refs, même logique)
- Dots : **probablement OK** (même refs, même logique)
- **Bulle : N'APPARAÎT PAS**

La bulle EST dans le DOM (rendu inconditionnel) avec opacity 0 / left -9999 / top -9999. L'`updateAtPointer` met `opacity = '1'` ET `left/top` à la position souris. SI tout fonctionnait, la bulle apparaîtrait à côté du curseur. Donc l'une des conditions suivantes a échoué.

---

## CAUSE PROBABLE

### Hypothèse 1 (TRÈS PROBABLE) — Ancêtre transformé qui casse `position: fixed`

Sur desktop, `ActivityDetail` est rendu dans une chaîne de divs. Le code lui-même contient un commentaire (l. 1911-1912) :
> « Sheet rendu via portal sur document.body pour échapper à tout containing block créé par un ancêtre transformé (ex: bottom-sheet de l'activité). »

Cela confirme une **prise de conscience préalable** que les ancêtres peuvent créer un containing block. Plusieurs sources potentielles à vérifier :

- **`SectionLayout`** wraps son contenu dans un div avec `.sl-slide-right` / `.sl-slide-left` (animation keyframes qui appliquent `transform: translateX(…)`). MAIS : `ActivityDetail` n'est PAS rendu dans `SectionLayout` directement (vérifié l. 7639-7653 — appel direct dans la page Activities). Donc à ÉCARTER pour le call site activités.
- **Page Activities elle-même** ou **AppShell** (sidebar) — peut avoir un `transform` ou `will-change: transform` quelque part sur le wrapper principal. **À vérifier** dans `globals.css` ou les composants de layout.
- **Section component** ou autre wrapper du contenu — `Section title="Courbes"` enveloppe le tooltip. Si `Section` (ou son parent) a `transform` ou `will-change`, le `position: fixed` se retrouve relatif à ce parent transformé, pas au viewport. Avec `left: -9999`, la bulle serait à 9999 px à gauche du parent → invisible.

**Test à demander à l'utilisateur** :
1. Ouvrir les DevTools sur desktop
2. Inspecter le DOM, trouver le tooltip `<div>` avec `position: fixed`
3. Cliquer dessus, regarder le panneau Computed → vérifier la valeur computed de `position`
4. Survoler le chart : observer si la bulle se déplace (à des coordonnées potentiellement étranges)
5. Remonter dans l'arbre DOM : pour chaque ancêtre, regarder Computed → `transform`. Le premier qui a une valeur non-`none` est le containing block fautif.

### Hypothèse 2 (POSSIBLE) — `bubble.offsetWidth` vaut 0 au premier hover

Quand la bulle a `opacity: 0` ET `left: -9999, top: -9999` AVANT le 1er repositionnement, sa largeur computed peut être un cas limite. Si `offsetWidth === 0`, alors le calcul de basculement bord-droit est buggy mais ne devrait pas empêcher l'affichage — le `left = clientX + 12` reste valide.

Probabilité plus faible. À écarter sauf si Hypothèse 1 est invalidée.

### Hypothèse 3 (POSSIBLE) — `isDesktop` reste `false` après mount

Le user-agent / browser peut ne pas matcher `(hover: hover) and (pointer: fine)`. Par exemple :
- Chrome avec **DevTools Device Toolbar activé** (mode mobile simulation) → matchMedia retourne false
- Macbook avec trackpad : généralement `pointer: fine` matche
- Écran tactile Windows : `hover: hover` peut être false ou indéterminé

Si `isDesktop` reste `false`, la bulle est rendue avec `position: static` (in-flow) au-dessus du chart — visible mais en haut, pas qui suit la souris.

**Test à demander** : dans la console navigateur, taper :
```js
window.matchMedia('(hover: hover) and (pointer: fine)').matches
```
Si `false` → c'est la cause.

### Hypothèse 4 (MOINS PROBABLE) — `pointer-events: none` sur un ancêtre

Si un wrapper parent de la zone chart a `pointer-events: none`, les pointer events ne se déclenchent pas → `onPointerMove` n'est jamais appelé → la bulle reste à `-9999`. Mais le user dit que crosshair + dots fonctionnent (qui dépendent du même handler), donc cette hypothèse est invalidée.

### Hypothèse 5 (À ÉCARTER) — La bulle est rendue mais opaque

`opacity` initial est `0` et `updateAtPointer` la passe à `1`. Si la transition `opacity 0.15s` est interrompue (par exemple par un autre `setState` qui re-rend la bulle et reset les styles inline), l'opacity pourrait osciller. Mais aucun setState dans `updateAtPointer`. À écarter sauf preuve contraire.

---

## CONCLUSION DU DIAGNOSTIC

**Hypothèse principale : un ancêtre du tooltip a `transform` / `filter` / `perspective` / `will-change: transform` non-`none`**, ce qui transforme le `position: fixed` en `position: absolute relatif à cet ancêtre`. Combiné à `left: -9999`, la bulle est positionnée à 9999 px hors de cet ancêtre → **invisible mais présente dans le DOM**.

**Action recommandée pour confirmer** : demander à l'utilisateur de procéder à l'inspection DOM décrite dans le test de l'Hypothèse 1. Si confirmé, le fix consistera à :
- soit rendre le tooltip via `createPortal(tooltip, document.body)` (pattern déjà utilisé l. 1913 pour le sel-sheet)
- soit nettoyer les transforms intermédiaires si pas indispensables

**Aucune modification effectuée.**
