// ════════════════════════════════════════════════════════════════════
// liveMachine — machine à états PURE de l'écran live (PROMPT_LIVE_VELO §8)
// + timer par TIMESTAMPS ABSOLUS (jamais d'incrément de compteur) + fonctions
// de calcul pures et testables (moyenne pondérée, NP, lissage 3 s, formats).
// Aucune dépendance React / DOM : tout est déterministe.
// ════════════════════════════════════════════════════════════════════

// ── Machine à états ──────────────────────────────────────────────────
// idle → recording → paused / autopaused / locked → stopping → summary
// → uploading → uploaded

export type LivePhase =
  | 'idle'
  | 'recording'
  | 'paused'
  | 'autopaused'
  | 'locked'
  | 'stopping'
  | 'summary'
  | 'uploading'
  | 'uploaded'

/** Sous-état actif pendant `locked` / `stopping` (pour reprendre au bon endroit). */
export type LiveSubPhase = 'recording' | 'paused' | 'autopaused'

export interface LiveMachine {
  phase: LivePhase
  /** État sous-jacent quand phase === 'locked'. */
  lockedFrom: LiveSubPhase | null
  /** État sous-jacent quand phase === 'stopping' (sheet de sortie ouverte). */
  stoppingFrom: LiveSubPhase | null
}

export const LIVE_INIT: LiveMachine = { phase: 'idle', lockedFrom: null, stoppingFrom: null }

export type LiveEvent =
  | { type: 'START' }
  | { type: 'PAUSE' }
  | { type: 'RESUME' }
  | { type: 'AUTO_PAUSE' }
  | { type: 'AUTO_RESUME' }
  | { type: 'LOCK' }
  | { type: 'UNLOCK' }
  | { type: 'REQUEST_STOP' }
  | { type: 'CANCEL_STOP' }
  | { type: 'FINISH' }
  | { type: 'RESTORE_SUMMARY' }
  | { type: 'UPLOAD' }
  | { type: 'UPLOAD_DONE' }
  | { type: 'UPLOAD_FAIL' }
  | { type: 'DISCARD' }

export function liveReducer(s: LiveMachine, e: LiveEvent): LiveMachine {
  switch (e.type) {
    case 'START':
      return s.phase === 'idle' ? { phase: 'recording', lockedFrom: null, stoppingFrom: null } : s

    case 'PAUSE':
      return s.phase === 'recording' ? { ...s, phase: 'paused' } : s

    case 'RESUME':
      // Reprise manuelle depuis pause OU pause auto (bouton central).
      return s.phase === 'paused' || s.phase === 'autopaused' ? { ...s, phase: 'recording' } : s

    case 'AUTO_PAUSE':
      if (s.phase === 'recording') return { ...s, phase: 'autopaused' }
      if (s.phase === 'locked' && s.lockedFrom === 'recording') return { ...s, lockedFrom: 'autopaused' }
      return s

    case 'AUTO_RESUME':
      if (s.phase === 'autopaused') return { ...s, phase: 'recording' }
      if (s.phase === 'locked' && s.lockedFrom === 'autopaused') return { ...s, lockedFrom: 'recording' }
      return s

    case 'LOCK':
      if (s.phase === 'recording' || s.phase === 'paused' || s.phase === 'autopaused') {
        return { ...s, phase: 'locked', lockedFrom: s.phase }
      }
      return s

    case 'UNLOCK':
      return s.phase === 'locked' ? { ...s, phase: s.lockedFrom ?? 'recording', lockedFrom: null } : s

    case 'REQUEST_STOP': {
      if (s.phase === 'recording' || s.phase === 'paused' || s.phase === 'autopaused') {
        return { phase: 'stopping', lockedFrom: null, stoppingFrom: s.phase }
      }
      if (s.phase === 'locked') {
        return { phase: 'stopping', lockedFrom: null, stoppingFrom: s.lockedFrom ?? 'recording' }
      }
      return s
    }

    case 'CANCEL_STOP':
      return s.phase === 'stopping'
        ? { phase: s.stoppingFrom ?? 'recording', lockedFrom: null, stoppingFrom: null }
        : s

    case 'FINISH':
      return s.phase === 'stopping' ? { phase: 'summary', lockedFrom: null, stoppingFrom: null } : s

    case 'RESTORE_SUMMARY':
      // Reprise d'un backup local non envoyé (au montage de l'écran).
      return s.phase === 'idle' ? { phase: 'summary', lockedFrom: null, stoppingFrom: null } : s

    case 'UPLOAD':
      return s.phase === 'summary' ? { ...s, phase: 'uploading' } : s

    case 'UPLOAD_DONE':
      return s.phase === 'uploading' ? { ...s, phase: 'uploaded' } : s

    case 'UPLOAD_FAIL':
      return s.phase === 'uploading' ? { ...s, phase: 'summary' } : s

    case 'DISCARD':
      return s.phase === 'stopping' || s.phase === 'summary'
        ? { phase: 'idle', lockedFrom: null, stoppingFrom: null }
        : s

    default:
      return s
  }
}

/** Une séance est en cours (entre Démarrer et le résumé). */
export function isStarted(s: LiveMachine): boolean {
  return s.phase === 'recording' || s.phase === 'paused' || s.phase === 'autopaused'
    || s.phase === 'locked' || s.phase === 'stopping'
}

/** Le chrono tourne (l'état effectif — même sous verrouillage — est recording). */
export function isTimerRunning(s: LiveMachine): boolean {
  if (s.phase === 'recording') return true
  if (s.phase === 'locked') return s.lockedFrom === 'recording'
  return false
}

/** État effectif (résout locked/stopping vers leur sous-état). */
export function effectivePhase(s: LiveMachine): LivePhase {
  if (s.phase === 'locked') return s.lockedFrom ?? 'recording'
  if (s.phase === 'stopping') return s.stoppingFrom ?? 'paused'
  return s.phase
}

// ── Timer par timestamps absolus ─────────────────────────────────────
// La durée est TOUJOURS recalculée depuis Date.now() (tick + visibilitychange),
// jamais incrémentée : le throttling navigateur en arrière-plan ne fausse rien.

export interface LiveTimer {
  startedAt: number | null
  pausedAccum: number
  pauseStartedAt: number | null
}

export const TIMER_INIT: LiveTimer = { startedAt: null, pausedAccum: 0, pauseStartedAt: null }

export function timerStart(now: number): LiveTimer {
  return { startedAt: now, pausedAccum: 0, pauseStartedAt: null }
}

export function timerPause(t: LiveTimer, now: number): LiveTimer {
  if (t.startedAt == null || t.pauseStartedAt != null) return t
  return { ...t, pauseStartedAt: now }
}

export function timerResume(t: LiveTimer, now: number): LiveTimer {
  if (t.startedAt == null || t.pauseStartedAt == null) return t
  return {
    startedAt: t.startedAt,
    pausedAccum: t.pausedAccum + (now - t.pauseStartedAt),
    pauseStartedAt: null,
  }
}

/** Durée active en secondes, reconstruite depuis les timestamps. */
export function timerElapsedSec(t: LiveTimer, now: number): number {
  if (t.startedAt == null) return 0
  const end = t.pauseStartedAt ?? now
  return Math.max(0, Math.floor((end - t.startedAt - t.pausedAccum) / 1000))
}

// ── Calculs purs ─────────────────────────────────────────────────────

/** Moyenne pondérée. Sans poids : moyenne simple. null si vide / poids nuls. */
export function weightedAverage(values: number[], weights?: number[]): number | null {
  if (values.length === 0) return null
  if (!weights) return values.reduce((a, b) => a + b, 0) / values.length
  let sum = 0
  let wSum = 0
  const n = Math.min(values.length, weights.length)
  for (let i = 0; i < n; i++) {
    sum += values[i] * weights[i]
    wSum += weights[i]
  }
  return wSum > 0 ? sum / wSum : null
}

export interface TimedSample { t: number; v: number }

/** Lissage sur fenêtre glissante (3 s par défaut) — moyenne des échantillons récents. */
export function smoothWindow(samples: TimedSample[], nowMs: number, windowMs = 3000): number {
  let sum = 0
  let n = 0
  for (let i = samples.length - 1; i >= 0; i--) {
    if (nowMs - samples[i].t > windowMs) break
    sum += samples[i].v
    n++
  }
  if (n === 0) return samples.length > 0 ? samples[samples.length - 1].v : 0
  return sum / n
}

/**
 * Puissance normalisée (NP) : moyennes glissantes 30 s (échantillons ~1 Hz),
 * élevées à la puissance 4, moyennées, puis racine 4e. null si < 30 échantillons.
 */
export function normalizedPower(watts: number[], windowS = 30): number | null {
  if (watts.length < windowS) return null
  let windowSum = 0
  let quadSum = 0
  let count = 0
  for (let i = 0; i < watts.length; i++) {
    windowSum += watts[i]
    if (i >= windowS) windowSum -= watts[i - windowS]
    if (i >= windowS - 1) {
      const mean = windowSum / windowS
      quadSum += mean ** 4
      count++
    }
  }
  if (count === 0) return null
  return Math.round((quadSum / count) ** 0.25)
}

// ── Formats (FR) ─────────────────────────────────────────────────────

/** H:MM:SS si ≥ 1 h (ou forcé), sinon MM:SS. */
export function formatHMS(sec: number, forceHours = false): string {
  const s = Math.max(0, Math.floor(sec))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const x = s % 60
  if (h > 0 || forceHours) {
    return `${h}:${String(m).padStart(2, '0')}:${String(x).padStart(2, '0')}`
  }
  return `${String(m).padStart(2, '0')}:${String(x).padStart(2, '0')}`
}

/** Nombre au format FR (virgule décimale). */
export function frNum(n: number, decimals: number): string {
  return n.toFixed(decimals).replace('.', ',')
}

/** Distance en mètres → « 350 m » / « 1,5 km ». */
export function formatDistShort(m: number): string {
  return m >= 1000 ? `${frNum(m / 1000, 1)} km` : `${Math.round(m)} m`
}
