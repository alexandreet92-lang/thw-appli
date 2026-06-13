// Types + helpers partagés du calcul SM (métabolique) / SN (neuromusculaire).
// Déterministe, aucun LLM. SM/SN = points de charge (ordre de grandeur TSS), non bornés.

export interface AthleteBenchmarks {
  ftp:    number | null   // FTP vélo (W)
  hrMax:  number | null   // FC max
  hrRest: number | null   // FC repos
  p5s:    number | null   // puissance max 5 s vélo (W)
  oneRm:  Record<string, number> | null // 1RM par exercice muscu (kg)
}

export interface StrengthSet { exercise: string; weightKg: number; reps: number; sets: number }

export interface ActivityMetricsInput {
  sportType:    string | null
  durationS:    number | null   // moving_time_s
  np:           number | null   // normalized_watts
  ftpAtTime:    number | null   // ftp_at_time (snapshot)
  avgHr:        number | null
  tempC:        number | null   // avg_temp_c
  dPlusM:       number | null   // elevation_gain_m
  dMinusM:      number | null   // total_descent_m ?? elevation_loss_m
  distanceM:    number | null
  wattsStream:  number[] | null // streams puissance (min > 120 % FTP)
  strengthSets: StrengthSet[] | null
}

export interface SmSn {
  sm: number
  sn: number
  smEstimated: boolean // true si fallback (donnée manquante) — ne pas présenter comme exact
  snEstimated: boolean
}

export const r = (n: number): number => Math.max(0, Math.round(n))
export const durMin = (durationS: number | null): number => (durationS ?? 0) / 60
export const distKm = (m: number | null): number => (m ?? 0) / 1000

/** FC relative (réserve cardiaque). null si données FC manquantes. */
export function fcRel(avgHr: number | null, hrRest: number | null, hrMax: number | null): number | null {
  if (avgHr == null || hrRest == null || hrMax == null || hrMax <= hrRest) return null
  return Math.max(0, (avgHr - hrRest) / (hrMax - hrRest))
}

/** Coefficient chaleur : 1 si température absente. */
export function kHeat(tempC: number | null): number {
  return tempC == null ? 1 : 1 + Math.max(0, (tempC - 22) * 0.025)
}

/** Minutes passées au-dessus d'un seuil de puissance (streams supposés ~1 Hz). */
export function minutesAbove(watts: number[], threshold: number): number {
  let n = 0
  for (const w of watts) if (w > threshold) n++
  return n / 60
}
