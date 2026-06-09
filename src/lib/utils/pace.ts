// ══════════════════════════════════════════════════════════════════
// Helpers d'allure (running) — format min'sec"/km centralisé.
// Allure en interne = nombre (minutes par km). Affichage = string.
// Vitesse en interne = km/h.
// ══════════════════════════════════════════════════════════════════

/** Formate une allure (minutes/km) en `4'30"`. Renvoie `—` si invalide. */
export function formatPace(minutesPerKm: number): string {
  if (!isFinite(minutesPerKm) || minutesPerKm <= 0) return '—'
  const m = Math.floor(minutesPerKm)
  const s = Math.round((minutesPerKm - m) * 60)
  // Gère l'arrondi des secondes à 60.
  if (s === 60) return `${m + 1}'00"`
  return `${m}'${String(s).padStart(2, '0')}"`
}

/** Vitesse (km/h) → allure (minutes/km). Infinity si vitesse nulle. */
export function speedToPace(speedKmh: number): number {
  if (speedKmh <= 0) return Infinity
  return 60 / speedKmh
}

/** Allure (minutes/km) → vitesse (km/h). 0 si allure nulle. */
export function paceToSpeed(paceMinPerKm: number): number {
  if (paceMinPerKm <= 0) return 0
  return 60 / paceMinPerKm
}

/** Vitesse (m/s) → allure (minutes/km). Infinity si vitesse nulle. */
export function speedMsToPace(speedMps: number): number {
  if (speedMps <= 0) return Infinity
  return 1000 / speedMps / 60
}

// ── Natation ────────────────────────────────────────────────────────────────

/** Formate une allure natation en secondes/100 m → `m:ss` (ex. 106 → "1:46"). */
export function formatPaceSwim(secPer100: number): string {
  if (!isFinite(secPer100) || secPer100 <= 0) return '—'
  const m = Math.floor(secPer100 / 60)
  const s = Math.round(secPer100 % 60)
  if (s === 60) return `${m + 1}:00`
  return `${m}:${String(s).padStart(2, '0')}`
}

/** Vitesse (m/s) → allure natation (secondes/100 m). Infinity si nulle. */
export function speedMsToSwimPace100(speedMs: number): number {
  if (speedMs <= 0) return Infinity
  return 100 / speedMs
}

/** Distance (m) → string auto m / km (ex. 850 → "850 m", 1500 → "1,5 km"). */
export function formatDistance(meters: number): string {
  if (!isFinite(meters) || meters <= 0) return '—'
  if (meters < 1000) return `${Math.round(meters)} m`
  return `${(meters / 1000).toFixed(1).replace('.', ',')} km`
}

