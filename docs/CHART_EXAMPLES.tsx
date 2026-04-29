/**
 * CHART_EXAMPLES.tsx
 * Référence visuelle pour tous les graphiques SVG de THW Coaching.
 * Claude Code : copie ces patterns, ne les réinvente pas.
 */

// ─── PATTERN 1 : Courbe linéaire premium (référence principale) ───────────────
//
// Règles visuelles :
// - Ligne : strokeWidth 1.5px, pas de remplissage, pas de gradient
// - Points : invisibles au repos (opacity 0), visibles au hover (r=3, opacity 1)
// - Pas de drop-shadow, pas de glow, pas de filter
// - Couleur : couleur sport du DS §2.3, jamais hardcodée
// - Interpolation : monotone cubic (Fritsch-Carlson)
// - Axe X : labels DM Mono 10px, --text-dim, tick toutes les 2 unités si dense
// - Axe Y : labels DM Mono 10px, --text-dim, 4-5 graduations max
// - Grille : lignes horizontales uniquement, stroke --border, opacity 0.3, strokeDasharray "3 3"
// - Crosshair : ligne verticale 1px, stroke --border, opacity 0.6, au survol uniquement

export const CURVE_STYLE = {
  line: {
    strokeWidth: 1.5,
    fill: 'none',
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  },
  point: {
    rDefault: 0,      // invisible au repos
    rHover: 3,        // visible au hover
    strokeWidth: 1.5,
    fillOpacity: 1,
  },
  grid: {
    stroke: 'var(--border)',
    strokeOpacity: 0.3,
    strokeDasharray: '3 3',
    strokeWidth: 1,
  },
  crosshair: {
    stroke: 'var(--border)',
    strokeOpacity: 0.6,
    strokeWidth: 1,
  },
  axis: {
    fontSize: 10,
    fontFamily: 'DM Mono, monospace',
    fill: 'var(--text-dim)',
  },
} as const

// ─── PATTERN 2 : Barres annuelles ────────────────────────────────────────────
//
// Règles visuelles :
// - borderRadius : 4px (rx="4" en SVG)
// - Couleur repos : couleur sport opacity 0.75
// - Couleur hover : couleur sport opacity 1.0
// - Barre année courante : opacity 1.0 + outline 1px couleur sport
// - Animation entrée : scaleY 0→1 depuis le bas, 350ms ease-out, délai +25ms par barre
// - Labels dans la barre : DM Mono 10px, blanc, uniquement si hauteur barre > 24px
// - Pas de gradient, pas de shadow

export const BAR_STYLE = {
  rx: 4,
  opacityDefault: 0.75,
  opacityHover: 1.0,
  opacitySelected: 1.0,
  label: {
    fontSize: 10,
    fontFamily: 'DM Mono, monospace',
    fill: '#ffffff',
    minHeightToShow: 24,
  },
  animation: {
    duration: 350,
    easing: 'cubic-bezier(0.0, 0.0, 0.2, 1)',
    delayPerBar: 25,
  },
} as const

// ─── PATTERN 3 : Tooltip au survol ───────────────────────────────────────────
//
// Règles visuelles :
// - Position : fixe en haut à droite du graphique (position absolute, top: 8px, right: 8px)
// - Jamais flottant sous la souris
// - Fond : var(--bg-card)
// - Border : 1px solid var(--border)
// - Border-radius : 8px
// - Padding : 10px 12px
// - Titre : DM Sans 11px semibold, --text-mid (mois/date)
// - Ligne par sport : bullet couleur sport 6px + label DM Sans 11px + valeur DM Mono 11px bold
// - Apparition : opacity 0→1, 80ms, pas de transform
// - Disparition : opacity 1→0, 60ms

export const TOOLTIP_STYLE = {
  position: { top: 8, right: 8 },
  padding: '10px 12px',
  borderRadius: 8,
  background: 'var(--bg-card)',
  border: '1px solid var(--border)',
  title: {
    fontSize: 11,
    fontFamily: 'DM Sans, sans-serif',
    fontWeight: 600,
    color: 'var(--text-mid)',
  },
  row: {
    fontSize: 11,
    fontFamily: 'DM Sans, sans-serif',
    valueFont: 'DM Mono, monospace',
    valueFontWeight: 700,
    bulletSize: 6,
  },
  animation: {
    enter: '80ms',
    exit: '60ms',
  },
} as const

// ─── PATTERN 4 : Sparkline (mini courbe dans une card KPI) ───────────────────
//
// Règles visuelles :
// - Hauteur : 32px fixe
// - Pas d'axe, pas de grille, pas de label
// - Ligne : strokeWidth 1px, couleur sport
// - Pas de points
// - Pas de gradient
// - Pas d'interaction

export const SPARKLINE_STYLE = {
  height: 32,
  line: {
    strokeWidth: 1,
    fill: 'none',
  },
} as const

// ─── RÈGLE GÉNÉRALE ──────────────────────────────────────────────────────────
//
// Tout graphique SVG dans l'app doit suivre ces patterns.
// Si un pattern ne couvre pas ton cas, ajoute-le ici AVANT de l'implémenter.
// Ne jamais inventer un style one-off directement dans un composant page.
