// Puissance max 5 s (p5s) depuis les streams puissance. Fenêtre glissante 5 s, max.
// Déterministe. La persistance (athlete_performance_profile.p5s_watts) se fait via un
// recalcul au fil des activités cyclisme avec puissance (backfill = job serveur séparé).

/** Meilleure moyenne sur 5 s d'un flux de watts (~1 Hz). 0 si insuffisant. */
export function maxRolling5s(watts: number[]): number {
  const win = 5
  if (!watts.length) return 0
  let sum = 0
  let best = 0
  for (let i = 0; i < watts.length; i++) {
    sum += watts[i] ?? 0
    if (i >= win) sum -= watts[i - win] ?? 0
    if (i >= win - 1) best = Math.max(best, sum / win)
  }
  return Math.round(best)
}

interface RowWithStreams { sport_type?: string | null; streams?: unknown; raw_data?: unknown }

function watts(row: RowWithStreams): number[] | null {
  const pick = (s: unknown): number[] | null => {
    if (!s || typeof s !== 'object') return null
    const w = (s as { watts?: unknown }).watts
    return Array.isArray(w) ? w.filter((x): x is number => typeof x === 'number') : null
  }
  return pick(row.streams) ?? pick((row.raw_data as { streams?: unknown } | null)?.streams) ?? null
}

/** Meilleur p5s sur un ensemble d'activités cyclisme (avec streams puissance). null si aucun. */
export function bestP5sFromActivities(rows: RowWithStreams[]): number | null {
  let best = 0
  for (const row of rows) {
    const s = (row.sport_type ?? '').toLowerCase()
    if (!(s.includes('bike') || s.includes('cycl') || s.includes('ride') || s.includes('velo'))) continue
    const w = watts(row)
    if (w) best = Math.max(best, maxRolling5s(w))
  }
  return best > 0 ? best : null
}
