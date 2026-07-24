// ──────────────────────────────────────────────────────────────────────────
// lapBeep — double bip audible à la validation d'un lap (WebAudio, zéro asset).
// iOS exige que l'AudioContext soit créé/réveillé pendant un geste utilisateur :
// appeler `primeLapBeep()` sur le premier tap (bouton Démarrer), puis
// `playLapBeep()` à chaque lap. Un bip principal 880 Hz (~150 ms, gain 0.2)
// suivi d'un second bip court de confirmation.
// ──────────────────────────────────────────────────────────────────────────

type AudioContextCtor = typeof AudioContext
interface WebkitWindow { webkitAudioContext?: AudioContextCtor }

let ctx: AudioContext | null = null

function getContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (!ctx) {
    const AC: AudioContextCtor | undefined =
      window.AudioContext ?? (window as unknown as WebkitWindow).webkitAudioContext
    if (!AC) return null
    try { ctx = new AC() } catch { return null }
  }
  if (ctx.state === 'suspended') void ctx.resume().catch(() => {})
  return ctx
}

/** À appeler sur un geste utilisateur (tap Démarrer) pour débloquer l'audio iOS. */
export function primeLapBeep(): void {
  getContext()
}

function tone(ac: AudioContext, startAt: number, freq: number, durSec: number, gain: number): void {
  const osc = ac.createOscillator()
  const g = ac.createGain()
  osc.type = 'sine'
  osc.frequency.value = freq
  osc.connect(g)
  g.connect(ac.destination)
  // Attaque/relâche courtes pour éviter les clics.
  g.gain.setValueAtTime(0.0001, startAt)
  g.gain.exponentialRampToValueAtTime(gain, startAt + 0.015)
  g.gain.setValueAtTime(gain, startAt + durSec - 0.03)
  g.gain.exponentialRampToValueAtTime(0.0001, startAt + durSec)
  osc.start(startAt)
  osc.stop(startAt + durSec + 0.02)
}

/** Bip principal 880 Hz (150 ms) + bip court de confirmation. */
export function playLapBeep(): void {
  const ac = getContext()
  if (!ac) return
  try {
    const now = ac.currentTime
    tone(ac, now, 880, 0.15, 0.2)
    tone(ac, now + 0.21, 1174.66, 0.08, 0.16) // confirmation (ré6), plus court
  } catch { /* audio indisponible — silencieux */ }
}
