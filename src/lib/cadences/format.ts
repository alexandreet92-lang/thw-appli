// ══════════════════════════════════════════════════════════════════
// CADENCES — format & saisie des valeurs, données dérivées (§7, §8).
// Pur, sans dépendance. Ne touche jamais au score (dérivées à part).
// ══════════════════════════════════════════════════════════════════

import type { TestConfig } from './types'

/** Parse un temps : "m:ss", "m:ss.d", "ss.d" ou secondes décimales → secondes. */
export function parseDuration(str: string): number | null {
  const s = str.trim().replace(',', '.')
  if (!s) return null
  if (s.includes(':')) {
    const parts = s.split(':')
    if (parts.length !== 2) return null
    const m = Number(parts[0]); const sec = Number(parts[1])
    if (!Number.isFinite(m) || !Number.isFinite(sec) || sec < 0 || sec >= 60) return null
    return m * 60 + sec
  }
  const n = Number(s)
  return Number.isFinite(n) ? n : null
}

/** Secondes → "m:ss" (ou "m:ss.d" si décimales). */
export function formatDuration(sec: number, decimals = false): string {
  if (!Number.isFinite(sec)) return '—'
  const m = Math.floor(sec / 60)
  const s = sec - m * 60
  const ss = decimals ? s.toFixed(1).padStart(4, '0') : String(Math.round(s)).padStart(2, '0')
  return `${m}:${ss}`
}

/** Nombre arrondi lisible (évite 0.6000000001). */
function round(n: number, d = 2): number {
  const f = 10 ** d
  return Math.round(n * f) / f
}

/** Affiche une valeur brute dans son unité de saisie. */
export function formatValue(test: TestConfig, value: number): string {
  switch (test.unit) {
    case 's': return formatDuration(value, value < 60)
    case 'm': return `${round(value, 2)} m`
    case 'kg': return `${round(value, 1)} kg`
    case 'W': return `${Math.round(value)} W`
    case 'tours': return `${round(value, 2)} tours`
    default: return String(round(value, 2))
  }
}

export interface Derived { label: string; value: string }

/** Données dérivées affichées après saisie (jamais utilisées dans le score, §7/§8). */
export function derivedData(test: TestConfig, rawValue: number, bodyWeightKg: number, distanceM?: number): Derived[] {
  const out: Derived[] = []
  // Ratios au poids de corps (force/haltéro) + 1RM Epley.
  if (test.kind === 'ratio' && test.unit === 'kg') {
    out.push({ label: 'Ratio au poids de corps', value: `${round(rawValue / bodyWeightKg, 2)}×` })
    const reps = test.slug.includes('2rm') ? 2 : 3
    const oneRm = rawValue * (1 + reps / 30)
    out.push({ label: '1RM estimé (Epley)', value: `${round(oneRm, 1)} kg` })
  }
  // Vélo : W/kg + FTP = 95 %.
  if (test.slug === 'bike_20min') {
    const wkg = rawValue / bodyWeightKg
    out.push({ label: 'Puissance', value: `${round(wkg, 2)} W/kg` })
    out.push({ label: 'FTP estimée (95 %)', value: `${Math.round(rawValue * 0.95)} W · ${round(wkg * 0.95, 2)} W/kg` })
  }
  // Allures / vitesses pour les épreuves de distance connue.
  const dist = distanceM ?? DISTANCE_M[test.slug]
  if (dist && test.unit === 's' && rawValue > 0) {
    const speed = dist / rawValue // m/s
    out.push({ label: 'Vitesse moyenne', value: `${round(speed, 2)} m/s · ${round(speed * 3.6, 1)} km/h` })
    const perKm = rawValue / (dist / 1000)
    if (dist >= 400) out.push({ label: 'Allure', value: `${formatDuration(perKm)} / km` })
    if (SWIM.has(test.slug)) out.push({ label: 'Allure', value: `${formatDuration(rawValue / (dist / 100))} / 100 m` })
  }
  return out
}

// Distances (m) pour les dérivées de vitesse/allure.
const DISTANCE_M: Record<string, number> = {
  sprint_30m: 30, sprint_100m: 100, run_400m: 400, run_3200m: 3200,
  swim_50m: 50, swim_200m: 200, repeat_200m_x6: 1200, agility_slalom: 180,
}
const SWIM = new Set(['swim_50m', 'swim_200m'])
