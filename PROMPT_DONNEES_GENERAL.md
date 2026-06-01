# PROMPT_DONNEES_GENERAL — Redesign onglet Général (SectionDonnees)

## Architecture
File: src/app/activities/page.tsx — function SectionDonnees only

## Nouveau helper
`computePMCSeries(acts, displayDays)` → Array<{date, ctl, atl, tsb}>
EWMA 42j/7j avec 90j warmup. Inséré avant SectionDonnees.

## Nouvelles données dans SectionDonnees
- `pmcActs` state: fetch started_at+tss+title sur 400 jours
- `pmcSeries`: useMemo sur pmcActs+displayDays
- `prevCutoff/prevInRange`: période précédente pour tendances
- `tssByDate`: Map<date, {tss, title}> pour heatmap
- `pmcHoverIdx` state + `pmcSvgRef` ref pour PMC tooltip

## Sections JSX

### SECTION 0 — Boutons pills
Deux groupes pills séparés par divider vertical (1px, 24px, var(--border))
Actif: background var(--text), color var(--bg)
Inactif: background var(--bg), color var(--text-dim), border var(--border)

### SECTION 1 — Hero 2 colonnes
Gauche: Arc SVG TSB (stroke-dasharray 270°) + couleur TSB + label statut
Droite: 3 cards CTL/ATL/TSB (borderTop 3px coloré, valeur 28px, barre progress)

### SECTION 2 — PMC
SVG viewBox="0 0 900 160", 3 courbes + hover tooltip
CTL cyan / ATL orange / TSB rouge pointillé
Ligne zéro grise

### SECTION 3 — 4 stats tendances
grid 4 cols: Séances / Distance / TSS Total / RPE Moyen
Tendances: ↑/↓/→ colorées vs période précédente

### SECTION 4 — Volume + Polarisation (2 cols)
Gauche: graphe barres empilées hebdo + déltas sport vs période précédente
Droite: 3 barres H polarisation (Z1-Z2 / Z3 / Z4-Z5) depuis hrTimesZ

### SECTION 5 — Heatmap (nouveau)
Cases 12×12px par jour, 7 lignes (semaines), couleurs par TSS
Tooltip date+TSS au survol

### SECTION 6 — Zones (3 colonnes, inchangé)

## Fichier modifié
- src/app/activities/page.tsx
