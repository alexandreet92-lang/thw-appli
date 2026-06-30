// Petite vibration haptique (best-effort, façon Claude).
// iOS Safari n'implémente PAS l'API Vibration → no-op sur le web iOS ; en natif
// (Capacitor Haptics) ce sera branché plus tard. Android / navigateurs compatibles OK.
export function haptic(pattern: number | number[] = 8): void {
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate(pattern)
    }
  } catch { /* ignore */ }
}
