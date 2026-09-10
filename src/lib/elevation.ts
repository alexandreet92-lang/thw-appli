// ══════════════════════════════════════════════════════════════════════════
// Utilitaires dénivelé / géométrie de parcours.
//  - elevationGainLoss : D+ / D- RÉALISTES (lissage + seuil d'hystérésis) pour
//    éviter la surestimation due au bruit des altitudes (GPS / MNT).
//  - pointAtDistance   : point (lat/lng) INTERPOLÉ à une distance donnée le long
//    d'une polyligne, pour synchroniser exactement le profil et la carte.
// ══════════════════════════════════════════════════════════════════════════
export interface LatLng { lat: number; lng: number }

export function haversine(a: LatLng, b: LatLng): number {
  const R = 6371000, toRad = (d: number) => d * Math.PI / 180
  const dLat = toRad(b.lat - a.lat), dLng = toRad(b.lng - a.lng)
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(s)))
}

/** Distances cumulées (m) le long d'une polyligne. cum[0] = 0. */
export function cumulativeDistances(pts: LatLng[]): number[] {
  const cum = new Array(pts.length).fill(0)
  for (let i = 1; i < pts.length; i++) cum[i] = cum[i - 1] + haversine(pts[i - 1], pts[i])
  return cum
}

/** Point interpolé à `target` mètres le long de la polyligne (cum = distances cumulées). */
export function pointAtDistance(pts: LatLng[], cum: number[], target: number): LatLng | null {
  if (pts.length === 0) return null
  if (pts.length === 1) return pts[0]
  const total = cum[cum.length - 1]
  if (target <= 0) return pts[0]
  if (target >= total) return pts[pts.length - 1]
  let lo = 0, hi = cum.length - 1
  while (lo < hi) { const mid = (lo + hi) >> 1; if (cum[mid] < target) lo = mid + 1; else hi = mid }
  const i = Math.max(1, lo)
  const a = pts[i - 1], b = pts[i], seg = cum[i] - cum[i - 1]
  const t = seg > 0 ? (target - cum[i - 1]) / seg : 0
  return { lat: a.lat + (b.lat - a.lat) * t, lng: a.lng + (b.lng - a.lng) * t }
}

/**
 * D+ / D- réalistes à partir d'un profil (distance/altitude). On lisse l'altitude
 * (moyenne glissante) puis on n'accumule un changement qu'au-delà d'un SEUIL
 * (hystérésis) : le bruit de ±quelques mètres autour du plat n'est plus compté,
 * fini la surestimation. threshold ≈ ce que fait Strava (quelques mètres).
 */
export function elevationGainLoss(
  profile: { distanceM: number; altitudeM: number }[] | null | undefined,
  opts: { threshold?: number; smoothHalf?: number } = {},
): { gain: number; loss: number } {
  const threshold = opts.threshold ?? 4
  const smoothHalf = opts.smoothHalf ?? 2
  if (!profile || profile.length < 2) return { gain: 0, loss: 0 }
  const alt = profile.map(p => p.altitudeM)
  // Moyenne glissante (anti-bruit).
  const sm = alt.map((_, i) => {
    let s = 0, n = 0
    for (let j = Math.max(0, i - smoothHalf); j <= Math.min(alt.length - 1, i + smoothHalf); j++) { s += alt[j]; n++ }
    return s / n
  })
  let gain = 0, loss = 0, ref = sm[0]
  for (let i = 1; i < sm.length; i++) {
    const d = sm[i] - ref
    if (d >= threshold) { gain += d; ref = sm[i] }
    else if (d <= -threshold) { loss += -d; ref = sm[i] }
  }
  return { gain: Math.round(gain), loss: Math.round(loss) }
}
