// ══════════════════════════════════════════════════════════════
// computeReadiness — readiness hybride (check-in subjectif + HRV + TSB).
// Fonction PURE, aucun appel réseau, testable isolément.
// ══════════════════════════════════════════════════════════════

export interface CheckinScales { sleepQuality: number; fatigue: number; soreness: number; mood: number } // 1..5

export interface ReadinessInputs {
  checkin?: CheckinScales | null
  hrvToday?: number | null
  hrvBaseline?: number | null    // moyenne glissante des nuits dispo
  hrvNightsCount?: number        // nb de nuits HRV (fiabilité baseline)
  tsb?: number | null
}

export type ReadinessKey = 'checkin' | 'hrv' | 'tsb'
export interface ReadinessComponent { key: ReadinessKey; value: number; weight: number; active: boolean }
export interface ReadinessResult { score: number | null; components: ReadinessComponent[] }

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))
const up5 = (v: number) => clamp(((v - 1) / 4) * 100, 0, 100)   // 1→0 … 5→100
const inv5 = (v: number) => clamp(((5 - v) / 4) * 100, 0, 100)  // 5→0 … 1→100

/** Score subjectif 0..100 = moyenne des 4 échelles (fatigue/soreness inversées). */
export function checkinScore(c: CheckinScales): number {
  return (up5(c.sleepQuality) + inv5(c.fatigue) + inv5(c.soreness) + up5(c.mood)) / 4
}

const BASE: Record<ReadinessKey, number> = { checkin: 0.40, hrv: 0.35, tsb: 0.25 }

export function computeReadiness(inp: ReadinessInputs): ReadinessResult {
  // ── Valeur + activité de chaque composante ────────────────────────
  const checkinActive = inp.checkin != null
  const checkinVal = checkinActive ? checkinScore(inp.checkin as CheckinScales) : 0

  const hrvActive =
    inp.hrvToday != null && inp.hrvBaseline != null && inp.hrvBaseline > 0 &&
    (inp.hrvNightsCount ?? 0) >= 4
  const hrvVal = hrvActive
    ? clamp(50 + ((inp.hrvToday as number) / (inp.hrvBaseline as number) - 1) * 250, 0, 100)
    : 0

  const tsbActive = inp.tsb != null
  const tsbVal = tsbActive ? clamp(55 + (inp.tsb as number) * 1.8, 0, 100) : 0

  const components: ReadinessComponent[] = [
    { key: 'checkin', value: Math.round(checkinVal), weight: BASE.checkin, active: checkinActive },
    { key: 'hrv',     value: Math.round(hrvVal),     weight: BASE.hrv,     active: hrvActive },
    { key: 'tsb',     value: Math.round(tsbVal),     weight: BASE.tsb,     active: tsbActive },
  ]

  // ── Renormalisation sur les composantes actives ───────────────────
  const active = components.filter(c => c.active)
  const totalW = active.reduce((s, c) => s + c.weight, 0)
  if (active.length === 0 || totalW === 0) return { score: null, components }

  const score = active.reduce((s, c) => s + c.value * (c.weight / totalW), 0)
  return { score: Math.round(clamp(score, 0, 100)), components }
}

/** Fatigue (/10) depuis l'échelle check-in 1..5 : 1→2, 2→4, 3→6, 4→8, 5→10. */
export function fatigueScore(fatigue1to5: number): number {
  return clamp(Math.round(fatigue1to5) * 2, 2, 10)
}
