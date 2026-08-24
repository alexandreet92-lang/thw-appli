// ══════════════════════════════════════════════════════════════════
// Kit de graphes THW — fondations partagées (couleurs, formats, échelles).
// SVG pur, aucune lib externe (règle projet). Theme-aware : l'encre, les
// surfaces et la grille passent par les tokens CSS (var(--…)), donc le rendu
// suit automatiquement le thème clair/sombre de l'app. Les couleurs de DONNÉE
// (séries, zones, charge) viennent de palettes validées ci-dessous.
// ══════════════════════════════════════════════════════════════════
import { LOAD_COLORS } from '@/lib/training/pmc'

// Tokens d'encre / surface (résolus par le navigateur selon le thème).
export const INK = {
  text: 'var(--text)',
  mid: 'var(--text-mid)',
  dim: 'var(--text-dim)',
  grid: 'var(--border)',
  surface: 'var(--bg-card)',
  surface2: 'var(--bg-card2)',
} as const

// Palette catégorielle — ordre FIXE (jamais cyclé). Validée CVD (paires
// adjacentes) : bleu · vert · violet · orange · rose. Au-delà de 5 séries →
// « Autre » / facettes, pas une teinte générée.
export const CATEGORICAL = ['#3B82F6', '#10B981', '#8B5CF6', '#F97316', '#EC4899'] as const

// Zones d'intensité (Z1→Z5) — rampe séquentielle/statut (gris→vert→jaune→orange→rouge).
export const ZONE = ['#9ca3af', '#16a34a', '#ca8a04', '#ea580c', '#dc2626'] as const

// Macros (convention diététique) — glucides / protéines / lipides.
export const MACRO = { carbs: '#F59E0B', protein: '#EF4444', fat: '#3B82F6' } as const

// Charge d'entraînement (CTL/ATL/TSB) — convention unique (cf. pmc.ts).
export const LOAD = LOAD_COLORS

// Statut (bon / attention / sérieux / critique) — réservé, jamais « série n ».
export const STATUS = { good: '#10B981', warn: '#F59E0B', serious: '#F97316', critical: '#EF4444' } as const

// Teinte de série par index (ordre fixe, repli modulo au-delà de la palette).
export function seriesColor(i: number): string { return CATEGORICAL[i % CATEGORICAL.length] }

// ── Formats ────────────────────────────────────────────────────────
export function fmtNum(n: number, d = 0): string {
  return (Math.round(n * 10 ** d) / 10 ** d).toLocaleString('fr-FR', { minimumFractionDigits: d, maximumFractionDigits: d })
}
export function fmtSigned(n: number, d = 0): string { return (n > 0 ? '+' : '') + fmtNum(n, d) }
export function fmtPct(n: number, d = 0): string { return `${fmtNum(n, d)} %` }
export function fmtDateShort(iso: string): string {
  try { return new Date(iso + (iso.length <= 10 ? 'T00:00:00' : '')).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) } catch { return iso }
}
export function fmtDuration(sec: number): string {
  if (sec >= 3600) { const h = Math.floor(sec / 3600), m = Math.round((sec % 3600) / 60); return `${h}h${m ? String(m).padStart(2, '0') : ''}` }
  if (sec >= 60) { const m = Math.floor(sec / 60), s = Math.round(sec % 60); return s ? `${m}:${String(s).padStart(2, '0')}` : `${m} min` }
  return `${Math.round(sec)}s`
}

// ── Échelles / géométrie ───────────────────────────────────────────
export function niceMax(v: number): number {
  if (v <= 0) return 1
  const mag = 10 ** Math.floor(Math.log10(v))
  const norm = v / mag
  const step = norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10
  return step * mag
}
export function polar(cx: number, cy: number, r: number, deg: number): [number, number] {
  const a = (deg - 90) * Math.PI / 180
  return [cx + r * Math.cos(a), cy + r * Math.sin(a)]
}
/** Arc SVG (path d) de startDeg à endDeg (sens horaire, 0° = haut). */
export function arcPath(cx: number, cy: number, r: number, startDeg: number, endDeg: number): string {
  const [x1, y1] = polar(cx, cy, r, startDeg)
  const [x2, y2] = polar(cx, cy, r, endDeg)
  const large = Math.abs(endDeg - startDeg) > 180 ? 1 : 0
  return `M${x1.toFixed(2)},${y1.toFixed(2)} A${r},${r} 0 ${large} 1 ${x2.toFixed(2)},${y2.toFixed(2)}`
}
/** Lissage : moyenne mobile centrée (pour courbes bruitées). */
export function smooth(vals: number[], win = 3): number[] {
  if (win <= 1 || vals.length < win) return vals
  const half = Math.floor(win / 2)
  return vals.map((_, i) => {
    let s = 0, n = 0
    for (let j = Math.max(0, i - half); j <= Math.min(vals.length - 1, i + half); j++) { s += vals[j]; n++ }
    return s / n
  })
}
