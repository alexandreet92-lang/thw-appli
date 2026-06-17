// ══════════════════════════════════════════════════════════════════
// Calculs allure / vitesse pour l'éditeur de course (fonctions pures).
// Dérivés de temps + distance. Renvoient '—' si une donnée manque
// (jamais de valeur fausse). Aucune dépendance UI.
// ══════════════════════════════════════════════════════════════════
import { parseTimeSec, fmtMinSec } from '@/app/calendar/components/types'

/** Allure /km (mm:ss) depuis un temps (HH:MM:SS) et une distance (km). */
export function paceKm(time: string, km: number): string {
  const s = parseTimeSec(time)
  if (s <= 0 || !km || km <= 0) return '—'
  return `${fmtMinSec(s / km)}/km`
}

/** Allure /100m (mm:ss) depuis un temps et une distance (mètres). */
export function pace100(time: string, meters: number): string {
  const s = parseTimeSec(time)
  if (s <= 0 || !meters || meters <= 0) return '—'
  return `${fmtMinSec(s / (meters / 100))}/100m`
}

/** Vitesse (km/h) depuis un temps et une distance (km). */
export function speedKmh(time: string, km: number): string {
  const s = parseTimeSec(time)
  if (s <= 0 || !km || km <= 0) return '—'
  return `${(km / (s / 3600)).toFixed(1)} km/h`
}

/** Split /500m (mm:ss) depuis un temps et une distance (mètres). */
export function split500(time: string, meters: number): string {
  const s = parseTimeSec(time)
  if (s <= 0 || !meters || meters <= 0) return '—'
  return `${fmtMinSec((s / meters) * 500)}/500m`
}

export const numOr0 = (v: unknown): number => {
  const n = parseFloat(String(v ?? '').replace(',', '.'))
  return isNaN(n) ? 0 : n
}
