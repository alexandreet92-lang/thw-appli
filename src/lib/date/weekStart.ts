// Clé `week_start` du planning — TOUJOURS calculée sur les composants LOCAUX.
//
// ⚠️ Bug historique : plusieurs chemins calculaient le lundi puis le
// sérialisaient via `toISOString()` (UTC). Dans un fuseau positif (ex.
// Europe/Paris UTC+2), le lundi local minuit devient le DIMANCHE en UTC → la
// chaîne enregistrée (« week_start ») ne correspondait plus à celle que la
// grille interroge (lundi local) → séances / intensités qui « disparaissent ».
// Ce module est la source unique de vérité : n'utilise JAMAIS toISOString pour
// une clé week_start.

// YYYY-MM-DD à partir des composants LOCAUX (pas d'UTC).
export function localDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// Index du jour dans une semaine qui commence le lundi (0 = lundi … 6 = dimanche).
export function mondayIndex(d: Date): number {
  return d.getDay() === 0 ? 6 : d.getDay() - 1
}

// Lundi (local) de la semaine contenant `d`, en YYYY-MM-DD.
export function weekStartStr(d: Date = new Date()): string {
  const m = new Date(d)
  m.setDate(d.getDate() - mondayIndex(d))
  return localDateStr(m)
}
