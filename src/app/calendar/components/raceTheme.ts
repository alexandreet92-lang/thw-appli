// Thème de l'éditeur de course : suit le THÈME de l'app (jour = clair, nuit =
// sombre). On ne surcharge AUCUN token couleur ici → SportFields et les cartes
// utilisent directement les tokens projet (--bg, --bg-card, --border, --text…)
// qui basculent automatiquement. On garde seulement la typo + les animations.
export const RACE_EDITOR_CSS = `
.race-ed .ed-fr { font-family: var(--font-display); letter-spacing: -0.02em; }
.race-ed .ed-tnum { font-variant-numeric: tabular-nums; }
.race-ed input, .race-ed textarea, .race-ed button { font-family: inherit; }
@keyframes raceSheetUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
@keyframes raceScrimIn { from { opacity: 0; } to { opacity: 1; } }
`
