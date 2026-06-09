// ══════════════════════════════════════════════════════════════════
// Split (aviron) — temps au 500 m, format m:ss.
// ══════════════════════════════════════════════════════════════════

/** Formate un split en secondes → `m:ss` (ex. 121 → "2:01"). */
export function formatSplit(sec: number): string {
  if (!isFinite(sec) || sec <= 0) return '—'
  const m = Math.floor(sec / 60)
  const s = Math.round(sec % 60)
  if (s === 60) return `${m + 1}:00`
  return `${m}:${String(s).padStart(2, '0')}`
}

/** Vitesse (m/s) → split /500 m en secondes. Infinity si nulle. */
export function speedMsToSplit500(speedMs: number): number {
  if (speedMs <= 0) return Infinity
  return 500 / speedMs
}

/** Vitesse (km/h) → split /500 m en secondes. */
export function speedKmhToSplit500(speedKmh: number): number {
  return speedKmh > 0 ? 500 / (speedKmh / 3.6) : Infinity
}
