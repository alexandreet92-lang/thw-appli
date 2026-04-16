/**
 * THW Coaching — Design System
 * Source of truth pour toutes les constantes visuelles.
 * Référence UI : Strava + TrainingPeaks
 */

// ─── Couleurs brand ───────────────────────────────────────────────
export const color = {
  // Brand
  brand:    '#00c8e0',   // cyan principal
  brandAlt: '#5b6fff',   // indigo accent

  // Sports
  sport: {
    running:  '#f97316',   // orange vif
    cycling:  '#00c8e0',   // cyan
    hyrox:    '#a855f7',   // violet
    gym:      '#22c55e',   // vert
  },

  // Sémantique
  success:  '#22c55e',
  warning:  '#f59e0b',
  danger:   '#ef4444',
  info:     '#5b6fff',

  // Métriques charge
  ctl:      '#00c8e0',   // forme — cyan
  atl:      '#ef4444',   // fatigue — rouge
  tsb:      '#5b6fff',   // forme nette — indigo
  volume:   '#f59e0b',   // volume — ambre

  // UI (CSS vars — utiliser directement dans style={})
  text:     'var(--text)',
  textMid:  'var(--text-mid)',
  textDim:  'var(--text-dim)',
  bg:       'var(--bg)',
  bgCard:   'var(--bg-card)',
  bgCard2:  'var(--bg-card2)',
  border:   'var(--border)',
  borderMid:'var(--border-mid)',
} as const

// ─── Transparences utilitaires ───────────────────────────────────
export function alpha(hex: string, opacity: number): string {
  // Pour les hex #rrggbb uniquement
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r},${g},${b},${opacity})`
}

// ─── Typographie ─────────────────────────────────────────────────
export const type = {
  // Familles
  syne:   "'Syne', sans-serif",
  dm:     "'DM Sans', sans-serif",
  mono:   "'DM Mono', monospace",

  // Échelle
  display: { fontFamily: "'Syne', sans-serif", fontSize: 36, fontWeight: 800, letterSpacing: '-0.04em', lineHeight: 1 },
  h1:      { fontFamily: "'Syne', sans-serif", fontSize: 28, fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1.1 },
  h2:      { fontFamily: "'Syne', sans-serif", fontSize: 18, fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.2 },
  h3:      { fontFamily: "'Syne', sans-serif", fontSize: 14, fontWeight: 600, letterSpacing: '-0.01em', lineHeight: 1.3 },

  // Labels de section
  label:   { fontFamily: "'DM Sans', sans-serif", fontSize: 11, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase' as const, lineHeight: 1 },
  labelMd: { fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase' as const, lineHeight: 1 },

  // Métriques chiffrées
  metricXl: { fontFamily: "'Syne', sans-serif", fontSize: 40, fontWeight: 800, letterSpacing: '-0.05em', lineHeight: 1 },
  metricLg: { fontFamily: "'Syne', sans-serif", fontSize: 32, fontWeight: 800, letterSpacing: '-0.04em', lineHeight: 1 },
  metricMd: { fontFamily: "'Syne', sans-serif", fontSize: 24, fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1 },

  // Corps
  body:   { fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 400, lineHeight: 1.5 },
  bodySm: { fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 400, lineHeight: 1.5 },
  bodyXs: { fontFamily: "'DM Sans', sans-serif", fontSize: 11, fontWeight: 400, lineHeight: 1.4 },

  // Mono
  monoMd: { fontFamily: "'DM Mono', monospace", fontSize: 14, fontWeight: 500 },
  monoSm: { fontFamily: "'DM Mono', monospace", fontSize: 12, fontWeight: 500 },
  monoXs: { fontFamily: "'DM Mono', monospace", fontSize: 11, fontWeight: 500 },
} as const

// ─── Espacement ──────────────────────────────────────────────────
export const space = {
  1:  4,
  2:  8,
  3:  12,
  4:  16,
  5:  20,
  6:  24,
  7:  28,
  8:  32,
  10: 40,
  12: 48,
} as const

// ─── Border radius ────────────────────────────────────────────────
export const radius = {
  sm:   8,
  md:   12,
  lg:   16,
  xl:   20,
  pill: 999,
} as const

// ─── Ombres ───────────────────────────────────────────────────────
export const shadow = {
  // Card standard : discrète, profondeur légère
  card:     '0 1px 2px rgba(0,0,0,0.04), 0 4px 16px rgba(0,80,150,0.06)',
  // Card élevée : hover, modal
  elevated: '0 4px 24px rgba(0,0,0,0.10), 0 1px 4px rgba(0,0,0,0.06)',
  // Glow colorés
  glow: (hex: string) => `0 0 24px ${alpha(hex, 0.22)}`,
} as const

// ─── Styles de card pré-construits ───────────────────────────────
export const cardBase: React.CSSProperties = {
  background:   'var(--bg-card)',
  border:       '1px solid var(--border)',
  borderRadius:  radius.lg,
  padding:       `${space[6]}px`,
  boxShadow:     shadow.card,
}

export const cardCompact: React.CSSProperties = {
  ...cardBase,
  padding: `${space[4]}px`,
}

// ─── Badge / pill ─────────────────────────────────────────────────
export function sportBadgeStyle(sport: keyof typeof color.sport): React.CSSProperties {
  const c = color.sport[sport]
  return {
    display: 'inline-flex', alignItems: 'center', gap: 4,
    padding: '3px 10px', borderRadius: radius.pill,
    background: alpha(c, 0.12),
    border: `1px solid ${alpha(c, 0.25)}`,
    color: c,
    ...type.label,
  }
}

// ─── Icônes sport (SVG inline) ────────────────────────────────────
export const sportIcon: Record<string, string> = {
  running:  '🏃',
  cycling:  '🚴',
  hyrox:    '🏋️',
  gym:      '💪',
}

// ─── Couleur sport depuis string ──────────────────────────────────
export function sportColor(sport: string): string {
  return color.sport[sport as keyof typeof color.sport] ?? color.brand
}
