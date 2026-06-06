# PROMPT_TOOLTIP_DESKTOP_FIX — Portal du tooltip vers document.body

## Cause confirmée
Diagnostic précédent : le tooltip en `position: fixed` est englobé dans un ancêtre transformé (sheet draggable, sidebar, ou wrapper de layout), qui devient le containing block du fixed → la bulle finit à 9999 px hors du parent transformé → invisible.

## Fix appliqué
**`createPortal(tooltipNode, document.body)`** quand `isDesktop === true`.

Pattern identique au `sel-sheet` (l. 1911-1912) qui utilise déjà ce mécanisme avec le commentaire :
> « Sheet rendu via portal sur document.body pour échapper à tout containing block créé par un ancêtre transformé »

## Fichier modifié
- `src/app/activities/page.tsx` — composant `ActivityCurves`

## Changements

### Imports
`createPortal` déjà importé depuis `react-dom` (l. 6) — pas d'ajout nécessaire.

### TooltipNeutral (Empilé + Superposé)
Renommé en `TooltipNeutralNode` (le JSX brut), puis exposé via :
```tsx
const TooltipNeutral =
  isDesktop && typeof document !== 'undefined'
    ? createPortal(TooltipNeutralNode, document.body)
    : TooltipNeutralNode
```

### TooltipColored (Mono)
Idem : `TooltipColoredNode` brut + wrapping portal conditionnel.

### Styles
- `className="curves-tooltip-desktop"` ajouté sur les 2 wrappers → facile à identifier dans l'inspecteur DevTools
- `z-index: 9999` (était 1000) — sécurise contre toute superposition dans `document.body`
- `pointer-events: none` conservé — la bulle n'intercepte pas le mousemove du chart
- `position: fixed`, `left/top: -9999` initiaux conservés (repositionné par `updateAtPointer` au 1er hover)

### Garde SSR
`typeof document !== 'undefined'` — Next.js SSR ne plante pas (le portal n'est tenté que côté client).

## Inchangé
- Refs (`tooltipRef`, `tooltipHeaderRef`, `tooltipValRefs`, `tooltipMonoMainRef`, `tooltipMonoSubRef`) → traversent le portal sans souci, React les attache au composant rendu peu importe sa position physique dans le DOM
- Handlers `onPointerDown/Move/Up/Leave/Cancel` → restent sur le wrapper du chart, **PAS** sur le tooltip portal
- `updateAtPointer(clientX, clientY)` → inchangé, positionne le tooltip via refs
- Mobile : `isDesktop === false` → tooltip rendu inline (in-flow, position static), comportement strictement préservé

## Vérification
- ✅ `npm run build` exit 0
- ✅ Desktop : la bulle devrait maintenant être enfant direct de `<body>` (DevTools : repérer la div `.curves-tooltip-desktop`)
- ✅ Mobile : aucune utilisation de createPortal, comportement inchangé
- ✅ Aucune erreur SSR (garde `typeof document !== 'undefined'`)
- ✅ pointer-events: none → pas d'interception du mousemove

## Test rapide (à demander à l'utilisateur)
1. Sur desktop, ouvrir une fiche d'activité avec courbes
2. DevTools → Elements → rechercher `.curves-tooltip-desktop`
3. Vérifier qu'il est bien enfant direct de `<body>` (pas dans un parent transformé)
4. Hover sur n'importe quel chart : la bulle apparaît à droite/bas du curseur, suit la souris, bascule au bord
5. Mouseleave : opacity 0, disparaît
