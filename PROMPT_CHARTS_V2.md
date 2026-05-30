# PROMPT_CHARTS_V2 — Corrections charts + carte mobile

## Partie 1 — Carte mobile + bouton icône
- Carte inexistante sur mobile : afficher ActivityMapCard (h=180px) juste après
  le KPI strip dans la colonne LEFT, uniquement sur mobile.
- Colonne RIGHT (carte desktop) : condition `!isMobile && !mapExpanded`
- Bouton expand : Maximize2 / Minimize2 (lucide-react) à la place des ⤢/⤡

## Partie 2 — Hover line se déclenche hors graphiques
- Ajouter `tracksAreaRef` qui entoure uniquement les tracks SVGs (pas le left-col label)
- `handleMove` et `handleDown` utilisent `tracksAreaRef` pour le calcul de `pct`
- `isOverCharts` géré par onMouseEnter/Leave sur `tracksAreaRef`
- containerRef garde position:relative + onMouseLeave pour reset complet

## Partie 3 — DecouplingChart enrichi + timeline
- Prop `temp` → courbe température (#6EE7B7, stroke 1.5, opacity 0.7)
- Prop `altitude` → valeur dans tooltip
- Prop `time` → timeline bar
- Tooltip enrichi : Temps | Puissance | FC | Altitude | Temp | Découplage au curseur
  - découplage = ((efAtCursor - avgEF) / avgEF) * 100 (vert >0, rouge <0)
- Composant `TimelineBar` : ticks toutes les 30 min, marker au curseur
  ajouté à DecouplingChart ET SyncCharts

## Partie 4 — PowerCurveChart corrections
- Log scale : Math.log → Math.log10
- Gridlines Y tous les 200W (yOf calculé depuis scale 0-based)
- Scale Y 0 → maxYWatts (0W en bas)
- console.log('[MMP] 5s:', mmp[0], '30s:', mmp[2], '5min:', mmp[5], ...)
- computeMmpCurve : cap des spikes à 1500W (Math.min(w, 1500))

## Fichiers modifiés
- `src/components/activity/ActivityMapCard.tsx`
- `src/app/activities/page.tsx`
