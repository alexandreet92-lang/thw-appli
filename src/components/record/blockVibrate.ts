// ──────────────────────────────────────────────────────────────────────────
// blockVibrate — vibration de TRANSITION DE BLOC pour tous les sports live
// (tapis, muscu/hyrox, boxe, home trainer…). Motif court double pour un
// changement de bloc/round/exercice, motif long pour la fin de séance.
// navigator.vibrate n'existe pas partout (iOS Safari) → silencieux sinon.
// ──────────────────────────────────────────────────────────────────────────

function vib(pattern: number | number[]): void {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try { navigator.vibrate(pattern) } catch { /* non supporté */ }
  }
}

/** Changement de bloc / round / exercice. */
export function vibrateBlockChange(): void {
  vib([180, 90, 180])
}

/** Fin de séance (dernier bloc terminé). */
export function vibrateSessionEnd(): void {
  vib([250, 110, 250, 110, 500])
}
