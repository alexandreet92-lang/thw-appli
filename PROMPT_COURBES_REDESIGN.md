# PROMPT_COURBES_REDESIGN — 3 formats + crosshair/tooltip via refs

## Fichier modifié
- `src/app/activities/page.tsx` — composant `ActivityCurves` étendu (Empilé COLLÉ, Superposé, Mono) + interactivité refs-based

## Étape 1 — Toggle 3 formats
Segmented control 3 boutons : `Empilé` (`AlignJustify`) / `Superposé` (`LayoutGrid`) / `Mono` (`Square`).
- Container `var(--bg-card2)` border `var(--border)` radius 8 padding 3 gap 2
- Bouton actif : background `var(--bg-card)`, color `var(--text)`, fw 700
- Bouton inactif : transparent, color `var(--text-dim)`, fw 500
- Persistance `localStorage['activity-charts-format']` ∈ `stacked | overlaid | mono`, défaut `stacked`

## Étape 2 — Lissage 30 s
`smoothSeries(values, win)` appliqué une fois via `useMemo([streams])`. `win = round(30 / dt)` où `dt = (time[10]-time[0])/10`. Min 2.

## Étape 3 — Format A : Empilé COLLÉ
Structure : 2 colonnes (label 60 px + charts flex 1) dans un wrapper `var(--bg-card2)` border-radius 10 overflow hidden.

- **Rows 70 px fixes**, `border-bottom: 1px var(--border)` entre eux (pas sur le dernier), aucun gap
- **Colonne label** : nom 12/700 en couleur sémantique + range `min – max unit` 9/`var(--text-dim)` tabular, padding 8/6, `border-right: 1px var(--border)`
- **Colonne chart** : SVG par row avec viewBox `0 0 1000 70` preserveAspectRatio none
  - Profil altitude en arrière-plan `fill="#94a3b8"` opacity 0.18 (toujours, même dans le row Altitude)
  - Zone area couleur sémantique fillOpacity 0.55 (0.5 pour Altitude)
- **Crosshair vertical** TRAVERSANT toute la colonne chart : `position: absolute; top: 0; bottom: 0; width: 1px; background: var(--border-mid); zIndex: 5`
- **Dots** par row : 8 px blanc cerclé `#0f172a` 2 px, transform `translate(-50%, -50%)`, zIndex 6
- Labels axe X commun en bas, padding-left 62 px (aligné sur la colonne chart)

## Étape 4 — Format B : Superposé
- **Toggles métriques** grille 3 cols × 2 rows. Dot 8 px + label couleur métrique fw 600 fs 10. `opacity: 0.35` si inactif. Persistance `localStorage['activity-charts-overlaid-metrics']` array.
  - Défaut au 1er mount : `hr, watts, speed`
- **Chart combiné** 260 px, `var(--bg-card2)` border-radius 10 overflow visible
  - 3 gridlines horizontales `stroke: var(--border)` opacity 0.5
  - Profil altitude TOUJOURS visible (`#94a3b8` opacity 0.18)
  - Lignes 2 px par métrique active (normalisées sur son range)
- **Crosshair + dots** par métrique active

## Étape 5 — Format C : Mono (nouveau)
- **Pills horizontales scrollables** : `overflow-x: auto` `gap: 6` `padding-bottom: 4`
  - Pill inactive : `bg var(--bg-card2)`, color `var(--text-dim)`
  - Pill active : `bg var(--text)`, color `var(--bg)` (inversion thème)
  - Persistance `localStorage['activity-charts-mono-metric']`, défaut `hr`
- **Chart** 280 px area chart couleur métrique fillOpacity 0.65 + altitude background `#94a3b8` 0.2
- **Crosshair + 1 dot** 10 px
- **Stats moy / max** : flex space-around + border-top/border-bottom `var(--border)`, valeur 16/700 couleur métrique tabular

## Étape 6 — Tooltip qui suit le doigt
### Tooltip neutre (Empilé + Superposé)
- `var(--bg-card)` + border `var(--border)` + radius 12 + padding 10 14 + shadow 0 4px 16px rgba(0,0,0,0.10)
- Header `tooltipHeaderRef` : 10 px uppercase letter-spacing 0.08em opacity 0.6
- Rows : dot 7 px couleur + nom métrique opacity 0.65 + valeur fw 700 couleur métrique tabular
- Format A : affiche TOUS les `presentKeys`
- Format B : affiche uniquement `presentKeys ∩ activeMetrics`

### Tooltip coloré (Mono)
- Background `monoBg` = couleur sémantique de la métrique sélectionnée
- Color noir ou blanc selon `textOnColor` du `MetricDef`
- Radius 12 padding 12 16 shadow 0 4px 16px rgba(0,0,0,0.15)
- Main `tooltipMonoMainRef` : 22 px fw 700 tabular (ex "176 bpm")
- Sub `tooltipMonoSubRef` : 11 px opacity 0.75 (ex "15,9 km · 48:32")

### Position
Position relative AU-DESSUS du chart (`marginBottom: 10`). Reste visible en haut, valeurs internes mises à jour via refs au mouvement du doigt.

## Étape 7 — Performance (refs DOM direct, ZÉRO setState au drag)
**Refs** :
- `containerRef` (chart container)
- `crosshairRef` (la ligne verticale)
- `dotRefsMap: Map<key, HTMLDivElement>` (un par métrique)
- `tooltipRef` (la bulle)
- `tooltipHeaderRef` (header neutre)
- `tooltipValRefs: Map<key, HTMLSpanElement>` (les `<span>` de valeur dans le neutre)
- `tooltipMonoMainRef`, `tooltipMonoSubRef` (pour Mono)

**`updateAtClientX(clientX)`** :
- Calcule `ratio = clamp((clientX - rect.left) / rect.width)` et `idx = round(ratio * (N-1))`
- `crosshair.style.left = ratio*100%` + opacity 1
- Pour chaque dot : calcule `yRatio = (v - min) / (max - min)` → `dot.style.left = ratio*100%`, `dot.style.top = (1-yRatio)*100%`, opacity 1
- Met à jour `tooltipHeader.textContent`, chaque `tooltipValRefs.span.textContent`, et `tooltipMono*.textContent`
- Toggle `tooltip.style.opacity = '1'`

**`hideHint()`** : remet toutes les opacities à 0.

**Handlers** : `onPointerDown/Move/Up/Leave/Cancel` (PointerEvents unifie touch + mouse).
- `setPointerCapture` au down → continuer le drag même hors zone
- Hover desktop (`buttons === 0 && pointerType === 'mouse'`) : on update quand même

**Aucun setState** dans aucun handler de pointage.

## Étape 8 — Mobile vs Desktop
Aucune différence visuelle. `var(--bg-card2)` partout. PointerEvents gèrent les 2 mode tactile et souris automatiquement.

## Inchangé
- `smoothSeries`, `MetricDef`, `METRIC_DEFS` (déjà créés au MVP précédent)
- `series` / `presentKeys` / helper `stats` (mais `statsMap` ajouté en `useMemo`)
- Section call sites (les 2 `<ActivityCurves />` mobile + desktop)
- `SyncCharts` toujours présent dans le fichier (non utilisé, mais conservé pour rollback éventuel)

## Vérification
- `npm run build` : ✅ 0 erreur TS
- Toggle 3 formats visible
- Persistance localStorage du format choisi + métriques actives + métrique mono
- **Empilé** : 6 rows collés, label column gauche 60 px, crosshair unique traversant, dot par row
- **Superposé** : toggles 3×2, chart 260 px, lignes 2 px, crosshair + dots par métrique active
- **Mono** : pills scrollables, area chart 280 px, tooltip COLORÉ couleur métrique, stats moy/max
- Tous les fonds via `var(--bg-card2)` / `var(--bg-card)` / `var(--bg)` — **JAMAIS #000 ni #fff fixes**
- Lissage 30 s appliqué via useMemo
- Aucun setState dans `updateAtClientX` / `hideHint` / pointer handlers
