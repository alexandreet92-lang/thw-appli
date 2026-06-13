// PMC double : CTL/ATL/TSB calculés séparément sur SM (métabolique) et SN (neuromusculaire).
// EWMA déterministe (42 j / 7 j). Aucune dépendance au TSS. SVG/affichage ailleurs.

const K_CTL = 1 - Math.exp(-1 / 42)
const K_ATL = 1 - Math.exp(-1 / 7)

export interface DayLoad { date: string; sm: number; sn: number }

export interface PmcDualPoint {
  date: string
  sm: number; ctlSm: number; atlSm: number; tsbSm: number
  sn: number; ctlSn: number; atlSn: number; tsbSn: number
}

function isoDay(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const r1 = (n: number) => Math.round(n * 10) / 10

/** Série PMC double sur `days` jours (seed 42 j avant pour amorcer l'EWMA). */
export function buildPmcDual(daily: DayLoad[], days: number): PmcDualPoint[] {
  const smMap: Record<string, number> = {}
  const snMap: Record<string, number> = {}
  for (const d of daily) {
    smMap[d.date] = (smMap[d.date] ?? 0) + d.sm
    snMap[d.date] = (snMap[d.date] ?? 0) + d.sn
  }
  const end = new Date()
  const start = new Date(end)
  start.setDate(end.getDate() - days - 42)
  const pts: PmcDualPoint[] = []
  let ctlSm = 0, atlSm = 0, ctlSn = 0, atlSn = 0
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const ds = isoDay(d)
    const sm = smMap[ds] ?? 0
    const sn = snMap[ds] ?? 0
    ctlSm += K_CTL * (sm - ctlSm); atlSm += K_ATL * (sm - atlSm)
    ctlSn += K_CTL * (sn - ctlSn); atlSn += K_ATL * (sn - atlSn)
    pts.push({
      date: ds,
      sm, ctlSm: r1(ctlSm), atlSm: r1(atlSm), tsbSm: r1(ctlSm - atlSm),
      sn, ctlSn: r1(ctlSn), atlSn: r1(atlSn), tsbSn: r1(ctlSn - atlSn),
    })
  }
  const cutoff = new Date(end); cutoff.setDate(end.getDate() - days)
  const cutStr = isoDay(cutoff)
  return pts.filter(p => p.date >= cutStr)
}

export interface LoadVerdict { label: string; tone: 'tired' | 'charged' | 'neutral' | 'fresh' | 'peak' }

/** Verdict combiné sur les deux axes (seuils du spec). */
export function combinedVerdict(tsbSm: number, tsbSn: number): LoadVerdict {
  if (tsbSm < -20 && tsbSn < -15) return { label: 'Très fatigué — récupération obligatoire', tone: 'tired' }
  if (tsbSm < -10 || tsbSn < -10) return { label: 'Chargé — surveille la récup', tone: 'charged' }
  if (tsbSm > 15 && tsbSn > 10)   return { label: 'En forme — conditions idéales', tone: 'peak' }
  if (tsbSm > 5 && tsbSn > 0)     return { label: 'Frais — tu peux pousser', tone: 'fresh' }
  return { label: 'Neutre — entraîne-toi normalement', tone: 'neutral' }
}

// Couleurs des courbes PMC (hors src/app|components → non scanné ; convention centralisée).
export const PMC_COLORS = { sm: '#06B6D4', sn: '#8B5CF6' } as const // SM cyan, SN violet
