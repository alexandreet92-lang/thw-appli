// ══════════════════════════════════════════════════════════════════
// weekStats — calculs partagés de la semaine du planning (page + feuille
// « Détail de la semaine ») : SM/SN prévus, n° de semaine ISO, répartition
// de l'intensité (prévue depuis les blocs, réalisée depuis RPE / IF).
// ══════════════════════════════════════════════════════════════════

export interface ZoneBlockLite {
  zone?: number; mode?: string; durationMin?: number
  reps?: number; effortMin?: number; recoveryMin?: number
}

// Estimation SM (métabolique) / SN (neuromusculaire) « prévu » depuis les blocs d'une séance.
const SM_COEF_PL = [0.6, 0.85, 1.05, 1.25, 1.45, 1.55, 1.62]
const SN_COEF_PL = [0, 0, 0.08, 0.25, 0.6, 1.1, 1.7]
export function estSmSn(blocks: readonly ZoneBlockLite[] | undefined, durationMin: number): { sm: number; sn: number } {
  let sm = 0, sn = 0, acc = 0
  for (const b of (blocks || [])) {
    const z = Math.max(1, Math.min(7, b.zone || 1))
    const iv = b.mode === 'interval' && b.reps && b.effortMin != null
    const tot = iv ? (b.reps as number) * ((b.effortMin as number) + (b.recoveryMin || 0)) : (b.durationMin || 0)
    const eff = iv ? (b.reps as number) * (b.effortMin as number) : (b.durationMin || 0)
    sm += tot * SM_COEF_PL[z - 1]; sn += eff * SN_COEF_PL[z - 1]; acc += tot
  }
  if (acc === 0 && durationMin > 0) sm = durationMin
  return { sm: Math.round(sm), sn: Math.round(sn) }
}

// Numéro de semaine ISO depuis une date YYYY-MM-DD.
export function isoWeekNum(ds: string): number {
  const d = new Date(ds + 'T00:00:00')
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  t.setUTCDate(t.getUTCDate() + 4 - (t.getUTCDay() || 7))
  const ys = new Date(Date.UTC(t.getUTCFullYear(), 0, 1))
  return Math.ceil(((t.getTime() - ys.getTime()) / 86400000 + 1) / 7)
}

/** Ajoute n jours à une date YYYY-MM-DD (heure locale). */
export function addDaysIso(ds: string, n: number): string {
  const d = new Date(ds + 'T00:00:00')
  d.setDate(d.getDate() + n)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export type IntensityBand = 'easy' | 'moderate' | 'hard'
export type BandSplit = Record<IntensityBand, number> & { unknown: number }
export const emptySplit = (): BandSplit => ({ easy: 0, moderate: 0, hard: 0, unknown: 0 })

/** Zone (1‥7) → bande : Z1-Z2 facile · Z3 modéré · Z4+ difficile. */
export function bandOfZone(z: number): IntensityBand {
  return z <= 2 ? 'easy' : z === 3 ? 'moderate' : 'hard'
}

/** Répartition PRÉVUE (minutes) d'une séance depuis ses blocs. */
export function plannedSplit(blocks: readonly ZoneBlockLite[] | undefined, durationMin: number, into: BandSplit): void {
  let acc = 0
  for (const b of (blocks || [])) {
    const z = Math.max(1, Math.min(7, b.zone || 1))
    const iv = b.mode === 'interval' && b.reps && b.effortMin != null
    if (iv) {
      const eff = (b.reps as number) * (b.effortMin as number)
      const rec = (b.reps as number) * (b.recoveryMin || 0)
      into[bandOfZone(z)] += eff; into.easy += rec; acc += eff + rec
    } else {
      const m = b.durationMin || 0
      into[bandOfZone(z)] += m; acc += m
    }
  }
  if (acc === 0 && durationMin > 0) into.unknown += durationMin
}

/** Bande RÉALISÉE d'une activité : RPE (1‥10) sinon IF vélo, sinon inconnue. */
export function bandOfActivity(rpe: number | null, intensityFactor: number | null): IntensityBand | null {
  if (rpe != null && rpe > 0) {
    const r = rpe > 10 ? rpe / 10 : rpe // certaines sources stockent 0‥100
    return r <= 4 ? 'easy' : r <= 6 ? 'moderate' : 'hard'
  }
  if (intensityFactor != null && intensityFactor > 0) {
    return intensityFactor < 0.76 ? 'easy' : intensityFactor < 0.9 ? 'moderate' : 'hard'
  }
  return null
}
