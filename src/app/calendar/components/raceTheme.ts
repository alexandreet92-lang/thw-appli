// Thème de l'éditeur de course : suit le THÈME de l'app (jour = clair, nuit =
// sombre). On ne surcharge AUCUN token couleur ici → SportFields et les cartes
// utilisent directement les tokens projet (--bg, --bg-card, --border, --text…)
// qui basculent automatiquement. On garde seulement la typo + les animations.
export const RACE_EDITOR_CSS = `
.race-ed .ed-fr { font-family: var(--font-display); letter-spacing: -0.02em; }
.race-ed .ed-tnum { font-variant-numeric: tabular-nums; }
.race-ed input, .race-ed textarea, .race-ed button { font-family: inherit; }
/* Focus soigné (halo primaire) sur tous les champs de l'éditeur. */
.race-ed input:focus, .race-ed textarea:focus {
  border-color: var(--primary) !important;
  box-shadow: 0 0 0 3px var(--primary-dim);
}
.race-ed input, .race-ed textarea { transition: border-color .15s ease, box-shadow .15s ease; }
@keyframes raceSheetUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
@keyframes raceScrimIn { from { opacity: 0; } to { opacity: 1; } }
/* Tant qu'un éditeur (stage / objectif) est ouvert, on masque la barre
   d'onglets du bas — sinon ses boutons chevauchent le footer de la sheet
   et « Enregistrer » devient invisible. */
body.race-editor-open .mobile-tab-bar { display: none !important; }
`
