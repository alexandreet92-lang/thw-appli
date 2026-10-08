'use client'
// ══════════════════════════════════════════════════════════════════
// Page plein écran qui GLISSE depuis la droite (façon iOS / Claude).
//  • Entrée : glisse de la droite vers la gauche (0,42 s, courbe douce).
//  • Sortie : retour vers la droite — via le bouton (fonction `close` passée aux
//    enfants) OU en glissant le doigt depuis le bord gauche (la page suit le
//    doigt ; relâchée au-delà de 30 % elle part, sinon elle revient).
//  • Remplace les animations CSS ad hoc : une seule source de mouvement.
// Toujours monté via createPortal par l'appelant ; `onClosed` démonte après la sortie.
// ══════════════════════════════════════════════════════════════════
import { animate, motion, useMotionValue } from 'motion/react'
import { useCallback, useEffect, useRef, type ReactNode, type TouchEvent } from 'react'
import { haptic } from '@/lib/haptics'

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1]
const EDGE = 44
const vw = () => (typeof window === 'undefined' ? 390 : window.innerWidth)

export function SlideOverlay({ onClosed, children, zIndex = 18000 }: {
  onClosed: () => void
  children: (close: () => void) => ReactNode
  zIndex?: number
}) {
  const x = useMotionValue(vw())
  const closing = useRef(false)
  const g = useRef({ x0: 0, y0: 0, active: false, decided: false, past: false, lp: 0, lt: 0, v: 0 })

  useEffect(() => {
    const c = animate(x, 0, { duration: 0.42, ease: EASE })
    return () => c.stop()
  }, [x])

  const close = useCallback(() => {
    if (closing.current) return
    closing.current = true
    // Durée calée sur la vitesse du geste (flick) ; sinon sortie standard.
    const remaining = Math.max(1, vw() - x.get())
    const ms = Math.max(160, Math.min(360, remaining / Math.max(Math.abs(g.current.v), 1.1)))
    animate(x, vw(), { duration: ms / 1000, ease: EASE, onComplete: onClosed })
  }, [x, onClosed])

  const start = (e: TouchEvent) => {
    const t = e.touches[0]
    const el = e.target instanceof Element ? e.target : null
    if (el?.closest('input, textarea, select, [contenteditable="true"], [data-no-sheet-drag]')) { g.current.active = false; return }
    g.current = { x0: t.clientX, y0: t.clientY, active: t.clientX <= EDGE, decided: false, past: false, lp: t.clientX, lt: e.timeStamp, v: 0 }
  }
  const move = (e: TouchEvent) => {
    const s = g.current
    if (!s.active) return
    const t = e.touches[0]
    const dx = t.clientX - s.x0, dy = t.clientY - s.y0
    if (!s.decided) {
      if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return
      s.decided = true
      if (Math.abs(dy) > Math.abs(dx)) { s.active = false; return }
    }
    const dt = e.timeStamp - s.lt
    if (dt > 0) s.v = 0.8 * ((t.clientX - s.lp) / dt) + 0.2 * s.v
    s.lp = t.clientX; s.lt = e.timeStamp
    x.set(Math.max(0, dx))
    const past = dx > vw() * 0.3
    if (past !== s.past) { s.past = past; haptic('light') }
  }
  const end = () => {
    const s = g.current
    if (!s.active) return
    s.active = false
    // Fermeture si distance > 30 % OU flick rapide vers la droite.
    if (x.get() > vw() * 0.3 || (s.v > 0.5 && x.get() > 12)) close()
    else animate(x, 0, { type: 'spring', stiffness: 380, damping: 36 })
  }

  return (
    <motion.div
      data-no-motion
      style={{ position: 'fixed', inset: 0, zIndex, x, background: 'var(--bg)', willChange: 'transform', touchAction: 'pan-y' }}
      onTouchStart={start} onTouchMove={move} onTouchEnd={end} onTouchCancel={end}
    >
      {/* ombre du bord gauche pendant le glissement */}
      <div aria-hidden style={{ position: 'absolute', top: 0, bottom: 0, left: -28, width: 28, pointerEvents: 'none', background: 'var(--edge-shadow)' }} />
      {children(close)}
    </motion.div>
  )
}
