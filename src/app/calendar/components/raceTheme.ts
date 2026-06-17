// Thème « éditorial clair » scoppé à `.race-ed` pour l'éditeur de course.
// Surcharge les tokens globaux utilisés par SportFields (et les nouveaux
// composants) → rendu clair cohérent sans toucher aux composants. Les hex
// sont centralisés ici (chaîne CSS), comme le thème éditorial mobile.
export const RACE_EDITOR_CSS = `
.race-ed {
  --bg: #faf9f6;
  --bg-card: #ffffff;
  --bg-card2: #faf9f6;
  --bg-elev: #ffffff;
  --input-bg: #ffffff;
  --text: #1a1a1a;
  --text-mid: #4a4a44;
  --text-dim: #8a8a82;
  --border: #e7e5df;
  --border-mid: #e7e5df;
  color: #1a1a1a;
  font-family: var(--font-body);
}
.race-ed .ed-fr { font-family: var(--font-display); letter-spacing: -0.02em; }
.race-ed .ed-tnum { font-variant-numeric: tabular-nums; }
.race-ed input, .race-ed textarea, .race-ed button { font-family: inherit; }
@keyframes raceSheetUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
@keyframes raceScrimIn { from { opacity: 0; } to { opacity: 1; } }
`
