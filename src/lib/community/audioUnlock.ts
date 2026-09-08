'use client'
// ══════════════════════════════════════════════════════════════════════════
// Déblocage audio iOS/WKWebView. Un AudioContext démarre « suspended » tant
// qu'il n'y a pas eu de geste utilisateur → la sonnerie d'appel entrant (jouée
// SANS geste) resterait muette. On crée UN contexte partagé et on le « resume »
// au tout premier geste de l'utilisateur dans l'app → ensuite la sonnerie peut
// sonner à tout moment. Idempotent, sûr côté SSR.
// ══════════════════════════════════════════════════════════════════════════

type Ctor = typeof AudioContext
let ctx: AudioContext | null = null
let installed = false

export function getSharedAudioCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null
  try {
    if (!ctx) {
      const AC: Ctor | undefined = window.AudioContext || (window as unknown as { webkitAudioContext?: Ctor }).webkitAudioContext
      if (!AC) return null
      ctx = new AC()
    }
    if (ctx.state === 'suspended') void ctx.resume().catch(() => {})
    return ctx
  } catch { return null }
}

// À appeler une fois au démarrage de l'app (ClientShell). Installe des écouteurs
// de premier geste qui débloquent le contexte audio partagé.
export function installAudioUnlock(): void {
  if (installed || typeof window === 'undefined') return
  installed = true
  const evts: (keyof WindowEventMap)[] = ['pointerdown', 'touchend', 'keydown', 'click']
  const unlock = () => {
    const c = getSharedAudioCtx()
    if (c) {
      void c.resume?.().catch(() => {})
      // Blip inaudible : force le déblocage complet sur certains WKWebView.
      try {
        const o = c.createOscillator(); const g = c.createGain()
        g.gain.value = 0; o.connect(g); g.connect(c.destination)
        o.start(); o.stop(c.currentTime + 0.02)
      } catch { /* ignore */ }
    }
    evts.forEach(e => window.removeEventListener(e, unlock))
  }
  evts.forEach(e => window.addEventListener(e, unlock, { passive: true }))
}
