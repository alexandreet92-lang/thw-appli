// ══════════════════════════════════════════════════════════════════
// VAP — Vitesse Ajustée par la Pente (approx. Strava GAP, modèle Minetti).
// Entrées en SI (m/s, m). Sortie en km/h (géométrie « rapide = haut »),
// convertie en allure (min/km) à l'affichage via les helpers de pace.
// ══════════════════════════════════════════════════════════════════

/** Facteur de coût métabolique relatif au plat pour une pente g (rise/run). */
export function gradeCostFactor(g: number): number {
  const cost = 1 + g * 5.43 + g * g * 18.84
  return Math.max(0.5, Math.min(2.5, cost))
}

/** Vitesse ajustée par la pente, échantillon par échantillon, en km/h. */
export function computeVapKmh(velocityMs: number[], altitude: number[], distance: number[]): number[] {
  const n = velocityMs.length
  return velocityMs.map((v, i) => {
    if (v <= 0) return 0
    const a = Math.max(0, i - 5), b = Math.min(n - 1, i + 5)
    const dAlt = (altitude[b] ?? altitude[i]) - (altitude[a] ?? altitude[i])
    const dDist = (distance[b] ?? distance[i]) - (distance[a] ?? distance[i])
    const g = dDist > 0 ? dAlt / dDist : 0
    return v * gradeCostFactor(g) * 3.6
  })
}

/** Distance cumulée (m) reconstituée depuis la vitesse (≈ 1 échantillon/s). */
export function distanceFromVelocity(velocityMs: number[]): number[] {
  const out: number[] = []
  let acc = 0
  for (const v of velocityMs) { acc += v > 0 ? v : 0; out.push(acc) }
  return out
}

/** Allure ajustée moyenne de l'activité (min/km). 0 si non calculable. */
export function avgAdjustedPaceMinKm(
  velocityMs: number[] | null | undefined,
  altitude: number[] | null | undefined,
  distance: number[] | null | undefined,
): number {
  if (!velocityMs || !altitude || velocityMs.length < 2) return 0
  const dist = distance ?? distanceFromVelocity(velocityMs)
  const vap = computeVapKmh(velocityMs, altitude, dist)
  const moving = vap.filter(v => v > 0)
  if (!moving.length) return 0
  const avgKmh = moving.reduce((a, b) => a + b, 0) / moving.length
  return avgKmh > 0 ? 60 / avgKmh : 0
}
