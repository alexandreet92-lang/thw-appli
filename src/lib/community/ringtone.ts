'use client'
// ══════════════════════════════════════════════════════════════════════════
// Sonnerie d'appel entrant — 100 % WebAudio (aucun fichier externe, aucune
// librairie). Motif à deux notes douces (ni trop aigu, ni trop grave : A4/C#5),
// répété toutes les ~2,4 s. S'arrête tout seul au bout de `maxMs` (30 s par
// défaut) ou via stop(). Respecte les navigateurs qui suspendent l'AudioContext
// tant qu'il n'y a pas eu de geste utilisateur (resume best-effort).
// ══════════════════════════════════════════════════════════════════════════

import { getSharedAudioCtx } from './audioUnlock'

export interface Ring { stop: () => void }

export function playRingtone(maxMs = 30_000): Ring {
  let stopped = false
  let loop: ReturnType<typeof setInterval> | null = null
  let endTimer: ReturnType<typeof setTimeout> | null = null

  const stop = () => {
    if (stopped) return
    stopped = true
    if (loop) { clearInterval(loop); loop = null }
    if (endTimer) { clearTimeout(endTimer); endTimer = null }
    // NB : on NE ferme PAS le contexte — il est PARTAGÉ (débloqué au 1er geste).
  }

  try {
    // Contexte partagé, déjà débloqué par un geste utilisateur (audioUnlock) →
    // le son passe même si la sonnerie démarre sans interaction.
    const ctx = getSharedAudioCtx()
    if (!ctx) return { stop }
    void ctx.resume?.().catch(() => {})

    // Une note = sinus avec enveloppe douce (attaque/relâchement) pour éviter le clic.
    const note = (freq: number, at: number, dur: number, peak = 0.16) => {
      if (!ctx) return
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.value = freq
      gain.gain.setValueAtTime(0, at)
      gain.gain.linearRampToValueAtTime(peak, at + 0.04)
      gain.gain.linearRampToValueAtTime(peak, at + dur - 0.08)
      gain.gain.linearRampToValueAtTime(0, at + dur)
      osc.connect(gain); gain.connect(ctx.destination)
      osc.start(at); osc.stop(at + dur + 0.02)
    }

    // Motif « dring-dring » : deux notes enchaînées.
    const pattern = () => {
      if (!ctx || stopped) return
      const t0 = ctx.currentTime + 0.02
      note(440, t0, 0.42)          // A4
      note(554.37, t0 + 0.48, 0.5) // C#5
    }

    pattern()
    loop = setInterval(pattern, 2400)
    endTimer = setTimeout(stop, maxMs)
  } catch { /* audio indisponible : la sonnerie est optionnelle, la modale reste */ }

  return { stop }
}
