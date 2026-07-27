// ══════════════════════════════════════════════════════════════════
// Helpers d'altimétrie partagés (profil de parcours + séquençage).
//
// RÈGLE : le D+ se calcule TOUJOURS sur la série d'altitude BRUTE
// (tous les points du fichier), avec le MÊME algorithme qu'à l'import
// (`src/lib/parcours/parseRouteFile.ts` → buildElevationProfile,
//  `src/lib/gpxParser.ts` → parseGPX) : somme des différences POSITIVES
// point à point, sans seuil ni hystérésis.
//
// Le rendu du profil, lui, utilise une série rééchantillonnée + lissée :
// elle écrase les petites bosses et divise le D+ par ~2. Elle ne doit donc
// JAMAIS servir à calculer un cumul — uniquement à dessiner et à lire une
// pente locale.
// ══════════════════════════════════════════════════════════════════

export interface ElePoint { distKm: number; ele: number }

/** D+ cumulé (m) point par point sur la série BRUTE. cum[i] = D+ de 0 à i. */
export function cumulativeGain(profile: ElePoint[]): number[] {
  const out = new Array<number>(profile.length).fill(0)
  for (let i = 1; i < profile.length; i++) {
    const d = profile[i].ele - profile[i - 1].ele
    out[i] = out[i - 1] + (d > 0 ? d : 0)
  }
  return out
}

/** D+ total (m) de la série brute — identique au D+ affiché dans les stats. */
export function totalGain(profile: ElePoint[]): number {
  const c = cumulativeGain(profile)
  return c.length ? c[c.length - 1] : 0
}

/** Index du dernier point dont distKm <= km (recherche dichotomique). */
export function indexAtKm(profile: ElePoint[], km: number): number {
  if (profile.length === 0) return 0
  let lo = 0, hi = profile.length - 1
  if (km <= profile[0].distKm) return 0
  if (km >= profile[hi].distKm) return hi
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1
    if (profile[mid].distKm <= km) lo = mid; else hi = mid
  }
  return lo
}

/** Altitude (m) interpolée au km demandé. */
export function eleAtKm(profile: ElePoint[], km: number): number {
  if (profile.length === 0) return 0
  const i = indexAtKm(profile, km)
  const a = profile[i], b = profile[i + 1]
  if (!b) return a.ele
  const span = b.distKm - a.distKm
  const t = span > 0 ? Math.max(0, Math.min(1, (km - a.distKm) / span)) : 0
  return a.ele + (b.ele - a.ele) * t
}

/** D+ cumulé (m) au km demandé, interpolé linéairement dans le segment courant. */
export function gainAtKm(profile: ElePoint[], cum: number[], km: number): number {
  if (profile.length === 0) return 0
  const i = indexAtKm(profile, km)
  const a = profile[i], b = profile[i + 1]
  if (!b) return cum[i] ?? 0
  const span = b.distKm - a.distKm
  const t = span > 0 ? Math.max(0, Math.min(1, (km - a.distKm) / span)) : 0
  const rise = b.ele - a.ele
  return (cum[i] ?? 0) + (rise > 0 ? rise * t : 0)
}

/** D+ (m) entre deux km, sur la série brute. */
export function gainBetween(profile: ElePoint[], cum: number[], aKm: number, bKm: number): number {
  return Math.max(0, gainAtKm(profile, cum, Math.max(aKm, bKm)) - gainAtKm(profile, cum, Math.min(aKm, bKm)))
}

// ── Physique du cyclisme ──────────────────────────────────────────
// P = (Crr·m·g·cosθ + m·g·sinθ)·v + ½·ρ·CdA·v³ — résolution par bissection.
export function solveSpeedMs(watts: number, massKg: number, gradPct: number): number {
  const g = 9.81, rho = 1.225, Crr = 0.005, CdA = 0.32
  const theta = Math.atan(gradPct / 100)
  const fRes = Crr * massKg * g * Math.cos(theta) + massKg * g * Math.sin(theta)
  const powerAt = (v: number) => fRes * v + 0.5 * rho * CdA * v * v * v
  let lo = 0.1, hi = 30
  if (powerAt(hi) <= watts) return hi
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2
    if (powerAt(mid) < watts) lo = mid; else hi = mid
  }
  // Bornes plausibles : ~2 km/h à ~90 km/h (descente)
  return Math.max(0.55, Math.min(25, (lo + hi) / 2))
}

/** Durée estimée (min) pour distKm à watts sur pente moyenne gradPct. */
export function estimatePortionMin(distKm: number, gradPct: number, watts: number, massKg: number): number {
  if (distKm <= 0 || watts <= 0) return 0
  const v = solveSpeedMs(watts, massKg, gradPct)
  return (distKm * 1000 / v) / 60
}

/**
 * Durée estimée (min) sur [aKm, bKm] en intégrant la pente LOCALE par tranches.
 * Nettement plus juste que la pente moyenne : une sortie 0 % de moyenne avec
 * 800 m de D+ ne se roule pas à la vitesse du plat.
 */
export function estimateRangeMin(
  profile: ElePoint[], aKm: number, bKm: number, watts: number, massKg: number, sliceKm = 0.5,
): number {
  const a = Math.min(aKm, bKm), b = Math.max(aKm, bKm)
  const span = b - a
  if (span <= 0 || watts <= 0 || profile.length < 2) return 0
  const n = Math.max(1, Math.ceil(span / sliceKm))
  let min = 0
  let prevEle = eleAtKm(profile, a)
  for (let i = 1; i <= n; i++) {
    const km = a + (span * i) / n
    const ele = eleAtKm(profile, km)
    const d = span / n
    const grad = ((ele - prevEle) / (d * 1000)) * 100
    min += estimatePortionMin(d, grad, watts, massKg)
    prevEle = ele
  }
  return min
}

export interface KmRange { startKm: number; endKm: number }

/**
 * Segments de [0, totalKm] NON couverts par `occupied` — sert à segmenter
 * le bloc de fond « endurance Z2 » autour des blocs d'intensité.
 */
export function freeSegments(totalKm: number, occupied: KmRange[], minKm = 0.05): KmRange[] {
  if (totalKm <= 0) return []
  const busy = occupied
    .map(o => ({ startKm: Math.max(0, Math.min(o.startKm, o.endKm)), endKm: Math.min(totalKm, Math.max(o.startKm, o.endKm)) }))
    .filter(o => o.endKm > o.startKm)
    .sort((x, y) => x.startKm - y.startKm)
  // Fusion des chevauchements
  const merged: KmRange[] = []
  for (const b of busy) {
    const last = merged[merged.length - 1]
    if (last && b.startKm <= last.endKm) last.endKm = Math.max(last.endKm, b.endKm)
    else merged.push({ ...b })
  }
  const out: KmRange[] = []
  let cursor = 0
  for (const m of merged) {
    if (m.startKm - cursor >= minKm) out.push({ startKm: cursor, endKm: m.startKm })
    cursor = Math.max(cursor, m.endKm)
  }
  if (totalKm - cursor >= minKm) out.push({ startKm: cursor, endKm: totalKm })
  return out
}
