// ══════════════════════════════════════════════════════════════
// PMC — source UNIQUE de la charge d'entraînement (CTL/ATL/TSB).
// Formule EWMA identique à celle historiquement dans PmcChart
// (Training/Recovery) ; on l'extrait ici pour la réutiliser sans
// recalcul divergent. Couleurs convention CTL/ATL/TSB centralisées
// (fichier hors src/app|src/components → non scanné par check-colors,
// cohérence avec Training : cf. getTSBColor / FitnessCards).
// ══════════════════════════════════════════════════════════════

import { estimateTss, type ActivityRow, type PmcPoint } from '@/app/recovery/components/types'

export type { ActivityRow, PmcPoint }

const K_CTL = 1 - Math.exp(-1 / 42)
const K_ATL = 1 - Math.exp(-1 / 7)

function isoDay(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Série PMC sur `days` jours (seed 42 j avant pour amorcer l'EWMA). */
export function buildPmc(activities: ActivityRow[], days: number): PmcPoint[] {
  const tssMap: Record<string, number> = {}
  for (const a of activities) {
    const d = a.started_at.slice(0, 10)
    tssMap[d] = (tssMap[d] ?? 0) + estimateTss(a)
  }
  const end = new Date()
  const start = new Date(end)
  start.setDate(end.getDate() - days - 42)
  const pts: PmcPoint[] = []
  let ctl = 0, atl = 0
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const ds = isoDay(d)
    const tss = tssMap[ds] ?? 0
    ctl = ctl + K_CTL * (tss - ctl)
    atl = atl + K_ATL * (tss - atl)
    pts.push({ date: ds, tss, ctl: Math.round(ctl * 10) / 10, atl: Math.round(atl * 10) / 10, tsb: Math.round((ctl - atl) * 10) / 10 })
  }
  const cutoff = new Date(end)
  cutoff.setDate(end.getDate() - days)
  const cutStr = isoDay(cutoff)
  return pts.filter(p => p.date >= cutStr)
}

/** Valeurs CTL/ATL/TSB du jour (dernier point), ou null si aucune activité. */
export function latestPmc(activities: ActivityRow[]): PmcPoint | null {
  if (activities.length === 0) return null
  const pts = buildPmc(activities, 1)
  return pts[pts.length - 1] ?? null
}

// ── Convention couleur CTL/ATL/TSB (cohérence Training) ──────────
export const LOAD_COLORS = {
  ctl:    '#06B6D4', // cyan — forme (chronique)
  atl:    '#F97316', // orange — fatigue (aiguë)
  tsbPos: '#10B981', // vert — frais
  tsbNeg: '#EF4444', // rouge — fatigué
} as const

/** Couleur TSB selon les seuils Training (getTSBColor : 5 / -10 / -25). */
export function tsbColor(tsb: number): string {
  if (tsb > 5)   return LOAD_COLORS.ctl
  if (tsb > -10) return LOAD_COLORS.atl
  return LOAD_COLORS.tsbNeg
}

export interface TsbVerdict { label: string; color: string }

/** Verdict TSB calé sur les seuils Training (5 / -10 / -25). */
export function tsbVerdict(tsb: number): TsbVerdict {
  if (tsb > 5)   return { label: 'Frais',          color: LOAD_COLORS.ctl }
  if (tsb > -10) return { label: 'Forme correcte', color: LOAD_COLORS.atl }
  if (tsb > -25) return { label: 'Fatigué',        color: LOAD_COLORS.tsbNeg }
  return           { label: 'Très fatigué',     color: LOAD_COLORS.tsbNeg }
}

/**
 * Jours estimés avant d'atteindre une forme « fraîche » (TSB ≥ target)
 * en projetant au repos (TSS = 0). 0 = déjà frais ; null = au-delà du cap.
 */
export function daysToOptimal(ctl: number, atl: number, target = 5, cap = 30): number | null {
  let c = ctl, a = atl
  if (c - a >= target) return 0
  for (let d = 1; d <= cap; d++) {
    c = c * (1 - K_CTL)
    a = a * (1 - K_ATL)
    if (c - a >= target) return d
  }
  return null
}
