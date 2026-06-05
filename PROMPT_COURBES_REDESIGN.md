# PROMPT_COURBES_REDESIGN — Refonte section Courbes

## Diagnostic
La section « Courbes » utilisait `SyncCharts` (589 lignes), un composant tout-en-un avec drag-to-select, lap rectangles, hover GPS, etc. Le redesign demande un layout différent + toggle 2 formats + lissage + tooltip Strava-style → **nouveau composant `ActivityCurves`** créé en parallèle, les 2 call sites swappés vers le nouveau.

## Fichier modifié
- `src/app/activities/page.tsx` — nouveau composant `ActivityCurves` ajouté l. 2654+, swap des `<SyncCharts>` aux 2 endroits (mobile l. 5637, desktop l. 6080)
- Import lucide : `+AlignJustify, +LayoutGrid`

## Composant `ActivityCurves`

### 1. Toggle format (segmented control)
- `Empilé` (`AlignJustify`) / `Superposé` (`LayoutGrid`)
- Container `var(--bg-card2)` border radius 8 padding 3 ; bouton actif `var(--bg-card)` + `var(--text)`, inactif transparent + `var(--text-dim)`
- localStorage `activity-charts-format` (`stacked`/`overlaid`)
- Défaut `stacked`

### 2. Lissage moyenne mobile
`smoothSeries(values, windowSize)` → fenêtre = `Math.round(30 / dt)` où `dt` = pas de temps moyen du stream. Appliqué une seule fois dans un `useMemo([s])` sur les 6 séries (Altitude, FC, Watts, Vitesse, Cadence, Temp).

### 3. Format A — Empilé (Strava-like)
Pour chaque métrique présente :
- **Header** : nom (`fontSize: 13`, fontWeight: 600, color métrique) + range `min – max unit` (`fontSize: 10`, `var(--text-dim)`, tabular-nums)
- **Chart 100 px** : background `#000000` mobile / `var(--bg-card2)` desktop, borderRadius 6, overflow hidden
- **Profil altitude en arrière-plan** : fill `rgba(58,58,58,0.6)` mobile / `rgba(203,213,225,0.6)` desktop — visible derrière chaque courbe
- **Zone area** : couleur sémantique, `fillOpacity: 0.6`, `strokeLinejoin: round`
- **Stats** sous chart : `Label moyenne {valeur unit}` à gauche, `Label max {valeur unit}` à droite, fontSize 11, color `var(--text-dim)`, valeur en couleur métrique fw 700 tabular
- **Espacement 18 px** entre blocs
- **Labels axe X commun** en bas : 4-5 ticks équidistants (`0 / 15 km / 30 km / 45 km / N km` ou minutes si pas de distance) — fontSize 9 `var(--text-dim)` tabular

### 4. Format B — Superposé
- **Toggles métriques** en grille 3 colonnes × 2 lignes
  - Dot 8 px couleur sémantique + label couleur métrique fw 600 fontSize 10
  - Border 1px `var(--border)`, background `var(--bg-card2)`, padding 6/8, radius 6
  - `opacity: 0.4` si inactif → clic toggle
  - localStorage `activity-charts-overlaid-metrics` (array)
  - Défaut au premier mount : `hr, watts, speed`
- **Chart combiné** :
  - Mobile 280 px, desktop 320 px
  - Background `#000000` mobile / `var(--bg-card2)` desktop
  - 3 gridlines horizontales discrètes (`rgba(255,255,255,0.05)` mobile / `rgba(0,0,0,0.06)` desktop)
  - Profil altitude arrière-plan (**toujours visible**, même si Altitude inactive comme courbe)
  - Lignes 1.8 px, `strokeLinejoin: round`, fill: none
  - Chaque métrique normalisée sur son propre range (multi-axes invisibles)
- **Labels axe X commun** identique au format A

### 5. Métriques + couleurs sémantiques (fixes)
| key | label | unit | color | textOnColor (tooltip mobile) |
|---|---|---|---|---|
| altitude | Altitude | m | `#94a3b8` | noir |
| hr | FC | bpm | `#f97316` | noir |
| watts | Puissance | W | `#6366f1` | blanc |
| speed | Vitesse | km/h | `#06B6D4` | noir |
| cadence | Cadence | rpm | `#ec4899` | noir |
| temp | Température | °C | `#10B981` | noir |

### 6. Données manquantes
Métriques non présentes (data null ou aucune valeur > 0) → exclues automatiquement de `presentKeys` → ni rendues en empilé, ni toggleables en superposé.

Composant retourne `null` si aucune métrique disponible.

## Inchangé
- `SyncCharts` reste défini dans le fichier (non supprimé) — réutilisable si besoin de rollback. Plus aucun call site actif.
- Branche desktop strictement intouchée en dehors du swap `SyncCharts → ActivityCurves`
- MMP, GAP, Decoupling, LapsChart, LapsBikeChart, autres sections : inchangés

## Limitations connues / suite (à valider)
Cette implémentation est un MVP solide qui delivers le cœur du spec : toggle 2 formats, lissage 30s, format A empilé avec altitude background, format B superposé multi-axes, persistance localStorage, couleurs sémantiques, fond noir mobile / var(--bg) desktop.

**Non implémenté dans ce MVP** (à venir si besoin) :
- **Crosshair + tooltip interactif au tap/hover** — la structure refs est en place (`containerRef`) mais le binding scroll/touch n'est pas câblé. Le spec demandait des tooltips couleurs Strava mobile + neutre desktop avec dot blanc cerclé noir 8 px, valeur en grand au-dessus, etc. À ajouter dans un second prompt avec gestion fine du mouse/touch position + ref-based crosshair update (pattern déjà appliqué au sheet draggable pour éviter les re-renders).

Le composant fonctionne et compile (`npm run build` OK). Les courbes s'affichent avec le bon style, le toggle persiste, le profil altitude est en arrière-plan partout — la base est posée pour ajouter l'interactivité dans un prompt suivant ciblé sur ce point.
