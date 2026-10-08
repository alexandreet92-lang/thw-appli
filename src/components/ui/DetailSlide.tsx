'use client'
// ══════════════════════════════════════════════════════════════════
// Conteneur d'une vue détail mobile : arrive de la droite (comme un push
// iOS), lien « ‹ Retour » en tête.
//  • Entrée : glisse de la droite (ressort iOS).
//  • Sortie : bouton « ‹ Retour » OU glissement du doigt depuis le bord
//    gauche (geste « retour » iOS) — la page suit le doigt, revient en
//    place sous le seuil, part vers la droite au-delà (ou sur un flick).
//  • Respecte prefers-reduced-motion.
// Seuls transform / opacity sont animés (60 fps).
// ══════════════════════════════════════════════════════════════════
import { animate, motion, useMotionValue, useReducedMotion, useTransform } from 'motion/react'
import { useCallback, useRef, type ReactNode, type TouchEvent } from 'react'
import { IOS_EASE } from '@/components/ui/motion'
import { haptic } from '@/lib/haptics'

const EDGE = 44          // zone de départ du glissement (px depuis le bord gauche)
const vw = () => (typeof window === 'undefined' ? 390 : window.innerWidth)

export function DetailSlide({ backLabel, onBack, children }: { backLabel: string; onBack: () => void; children: ReactNode }) {
  const reduce = useReducedMotion() ?? false
  const x = useMotionValue(0)
  const closing = useRef(false)
  // Ombre du bord gauche : visible seulement quand la page a quitté sa position.
  const shadow = useTransform(x, [0, 24], [0, 1], { clamp: true })
  const g = useRef({ x0: 0, y0: 0, active: false, decided: false, past: false, lp: 0, lt: 0, v: 0 })

  const close = useCallback(() => {
    if (closing.current) return
    closing.current = true
    if (reduce) { onBack(); return }
    const remaining = Math.max(1, vw() - x.get())
    const ms = Math.round(Math.max(0.16, Math.min(0.32, remaining / Math.max(Math.abs(g.current.v), 1.1) / 1000)) * 1000)
    void animate(x, vw(), { duration: ms / 1000, ease: IOS_EASE, onComplete: onBack })
  }, [reduce, x, onBack])

  const start = (e: TouchEvent) => {
    const t = e.touches[0]
    const el = e.target instanceof Element ? e.target : null
    // Champs de saisie / zones à swipe horizontal : jamais de geste de retour.
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
    if (x.get() > vw() * 0.3 || (s.v > 0.5 && x.get() > 12)) { close(); return }
    void animate(x, 0, { type: 'spring', stiffness: 380, damping: 36 })
  }

  return (
    <motion.div
      initial={reduce ? false : { x: '100%' }}
      animate={{ x: 0 }}
      transition={{ duration: reduce ? 0 : 0.34, ease: [0.32, 0.72, 0, 1] }}
      style={{ x, position: 'relative', display: 'flex', flexDirection: 'column', gap: 12, touchAction: 'pan-y', willChange: 'transform' }}
      onTouchStart={start} onTouchMove={move} onTouchEnd={end} onTouchCancel={end}
    >
      {/* Ombre du bord gauche pendant le glissement (sans débordement vertical). */}
      <motion.div aria-hidden style={{ position: 'absolute', top: 0, bottom: 0, left: -24, width: 24, pointerEvents: 'none', background: 'var(--edge-shadow)', opacity: shadow }} />
      <button type="button" onClick={onBack}
        style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: 2, border: 'none', background: 'none', padding: 0, cursor: 'pointer', fontSize: 15, fontWeight: 600, color: 'var(--primary)', fontFamily: 'inherit' }}>
        <svg aria-hidden width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
        {backLabel}
      </button>
      {children}
    </motion.div>
  )
}
