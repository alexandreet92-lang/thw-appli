# PROMPT_ACTIVITY_CSSFIX — Slide-up portal + crosshair hors-zone

## Fichiers modifiés
- src/app/activities/page.tsx
  - `SelectionSheet` : rendu via `createPortal(document.body)`, overlay `backdrop-filter: blur(4px)`, timings d'animation alignés
  - `SyncCharts.handleMove` : calcule `chartRect` depuis le 1er `<svg>` du `tracksAreaRef` au lieu du `tracksAreaRef` global

## Fix 1 — Slide-up : position fixed effective + fond flouté

### Cause racine
Le sheet utilise déjà `position: fixed` mais s'affichait "dans le flux" parce qu'un parent (le bottom-sheet mobile de l'activité, ligne 5189) a `animation: slideUpSheet` dont la keyframe applique `transform: translateY(…)`. Or, **toute valeur de `transform` autre que `none` crée un containing block pour les descendants `position: fixed`** (CSS spec). Résultat : `bottom: 0` du SelectionSheet est calculé par rapport au bottom-sheet parent, pas au viewport.

### Correctif
- Render via `createPortal(node, document.body)` → le sheet sort de l'arbre du parent transformé et son `position: fixed` se résout par rapport au viewport.
- Overlay : passe à `rgba(0,0,0,0.4)` + `backdrop-filter: blur(4px)` + préfixe `-webkit-` (Safari).
- Sheet : `maxHeight: 85vh` (spec utilisateur), reste identique : `position: fixed; left:0; right:0; bottom:0; zIndex: 601`.
- Animations :
  - Entrée : `translateY(100%) → translateY(0)`, 300 ms ease-out (déjà conforme).
  - Sortie : `translateY(0) → translateY(100%)`, 250 ms ease-in (au lieu de 280 ms ease-out).
- L'overlay reprend la même durée et utilise `forwards` pour rester opaque/disparaître proprement.

Rien d'autre n'est touché (contenu, données, logique de close, etc.).

## Fix 2 — Crosshair hors zone de tracé

### Cause racine
`tracksAreaRef` enveloppe **toute la rangée** : `[label-col 140px] + [chart-svg flex:1]`. Le calcul `rawPct = (clientX - chartRect.left) / chartRect.width` rendait `inPlot=true` quand la souris était au-dessus de la colonne de labels (rawPct ∈ [0, 0.14]).

### Correctif
Dans `SyncCharts.handleMove` :
- Récupère le **1er `<svg>`** à l'intérieur de `tracksAreaRef` via `querySelector('svg')`.
- Utilise sa `getBoundingClientRect()` comme zone de tracé.
- `inPlot` devient `rawPct ∈ [0, 1]` **par rapport à la zone SVG réelle** → faux quand la souris est sur les labels ou à gauche du conteneur.
- `pct` (clampé) est recalculé sur cette même zone → le curseur s'aligne sur la position réelle des données.

Quand la souris est dans la zone valide, comportement strictement identique à avant.

## Vérification
- npm run build : 0 erreur
- Slide-up : flotte par-dessus le contenu, fond flouté visible derrière
- Crosshair : invisible quand la souris est sur les labels (Max/Moy), réapparaît à l'entrée du graphique
