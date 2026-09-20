// Helpers de métriques dérivées, réutilisables côté serveur (auto-analyse).
// Logique identique à celle de l'AIPanel (dérive cardiaque) pour cohérence.

export interface StreamsLite {
  heartrate?: number[]
  watts?: number[]
  velocity_smooth?: number[]
  velocity?: number[]
}

/** Dérive cardiaque (%) : évolution FC 2e moitié vs 1re moitié de la séance. */
export function computeCardiacDrift(streams: StreamsLite | null | undefined): number | null {
  const hr = streams?.heartrate
  if (!hr || hr.length < 20) return null
  const half = Math.floor(hr.length / 2)
  const avg = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length
  const first = avg(hr.slice(0, half))
  if (!first) return null
  return Math.round(((avg(hr.slice(half)) - first) / first) * 1000) / 10
}
