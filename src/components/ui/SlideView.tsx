'use client'
// Glissement directionnel pour la navigation DRILL-DOWN intra-page
// (tuile → détail → sous-écran). Le sens est porté par `direction`
// (1 = on avance, -1 = on recule). Respecte prefers-reduced-motion.
//
// Deux variantes :
//  • 'fade' (défaut) : léger décalage + fondu — comportement historique.
//  • 'push'  : poussée façon iOS/Claude — la nouvelle page entre par la droite
//    tandis que l'ancienne recule de 30 %, SANS fondu (page toujours opaque).
//    Avec `onBack`, un glissement depuis le bord gauche fait SUIVRE la page au
//    doigt ; relâchée au-delà du seuil elle revient en arrière, sinon elle
//    reprend sa place (ressort).
import { forwardRef, useRef, type ReactNode, type TouchEvent } from 'react'
import { AnimatePresence, animate, motion, useMotionValue, useReducedMotion, useTransform } from 'motion/react'
import { haptic } from '@/lib/haptics'

interface Props {
  /** Clé unique de l'écran courant — un changement déclenche la transition. */
  screenKey: string
  /** 1 = on avance (entre depuis la droite), -1 = on recule. */
  direction: number
  children: ReactNode
  variant?: 'fade' | 'push'
  /** Variante 'push' : retour en arrière (bouton ou glissement depuis le bord gauche). */
  onBack?: () => void
  /** Variante 'push' : fond opaque des pages (évite toute transparence pendant le glissement). */
  background?: string
}

const EDGE = 44          // zone de départ du glissement (px depuis le bord gauche)
const DIM = 0.12         // opacité max du voile sur la page parente (recule à gauche)
const vw = () => (typeof window === 'undefined' ? 390 : window.innerWidth)

interface PushProps {
  children: ReactNode
  direction: number
  reduce: boolean
  onBack?: () => void
  background: string
}

// Page « poussée » : porte son propre décalage (x) pour suivre le doigt.
const PushPage = forwardRef<HTMLDivElement, PushProps>(function PushPage({ children, direction, reduce, onBack, background }, ref) {
  const x = useMotionValue(0)
  const st = useRef({ x0: 0, y0: 0, active: false, decided: false, past: false, lp: 0, lt: 0, v: 0 })
  // Voile iOS : la page parente s'assombrit en reculant vers la gauche (x négatif),
  // s'éclaircit en revenant. Aucune teinte quand la page est au repos ou glisse à droite.
  const dim = useTransform(x, [-vw() * 0.3, 0], reduce ? [0, 0] : [DIM, 0], { clamp: true })

  const start = (e: TouchEvent) => {
    const t = e.touches[0]
    const el = e.target instanceof Element ? e.target : null
    const inField = !!el?.closest('input, textarea, select, [contenteditable="true"], [data-no-sheet-drag]')
    st.current = { x0: t.clientX, y0: t.clientY, active: !!onBack && !inField && t.clientX <= EDGE, decided: false, past: false, lp: t.clientX, lt: e.timeStamp, v: 0 }
    // Le geste du bord gauche appartient à cette page : la sidebar (shell) ne doit pas s'armer.
    if (st.current.active) e.stopPropagation()
  }
  const move = (e: TouchEvent) => {
    const s = st.current
    if (!s.active) return
    const t = e.touches[0]
    const dx = t.clientX - s.x0
    const dy = t.clientY - s.y0
    if (!s.decided) {
      if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return
      s.decided = true
      if (Math.abs(dy) > Math.abs(dx)) { s.active = false; return }
    }
    e.stopPropagation()
    const dt = e.timeStamp - s.lt
    if (dt > 0) s.v = 0.8 * ((t.clientX - s.lp) / dt) + 0.2 * s.v
    s.lp = t.clientX; s.lt = e.timeStamp
    x.set(Math.max(0, dx))
    const past = dx > vw() * 0.3
    if (past !== s.past) { s.past = past; haptic('light') }
  }
  const end = () => {
    const s = st.current
    if (!s.active) return
    s.active = false
    // Retour si distance > 30 % OU flick rapide vers la droite.
    if (x.get() > vw() * 0.3 || (s.v > 0.5 && x.get() > 12)) onBack?.()
    else void animate(x, 0, { type: 'spring', stiffness: 420, damping: 38 })
  }

  return (
    <motion.div
      ref={ref}
      custom={direction}
      style={{ x, background, touchAction: 'pan-y', willChange: 'transform', position: 'relative' }}
      variants={{
        enter:  (d: number) => ({ x: reduce ? 0 : d > 0 ? vw() : -vw() * 0.3 }),
        center: { x: 0 },
        exit:   (d: number) => ({ x: reduce ? 0 : d > 0 ? -vw() * 0.3 : vw() }),
      }}
      initial="enter"
      animate="center"
      exit="exit"
      transition={{ duration: reduce ? 0.12 : 0.34, ease: [0.32, 0.72, 0, 1] }}
      onTouchStart={start}
      onTouchMove={move}
      onTouchEnd={end}
      onTouchCancel={end}
    >
      {/* Ombre du bord gauche (sans débordement vertical) */}
      <div aria-hidden style={{ position: 'absolute', top: 0, bottom: 0, left: -24, width: 24, pointerEvents: 'none', background: 'var(--edge-shadow)' }} />
      {/* Voile iOS sur la page parente pendant le push (transform/opacity seulement). */}
      <motion.div aria-hidden style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 1, background: '#000', opacity: dim }} /> {/* design-allow-color — voile de profondeur iOS */}
      {children}
    </motion.div>
  )
})

export function SlideView({ screenKey, direction, children, variant = 'fade', onBack, background = 'var(--bg)' }: Props) {
  const reduce = useReducedMotion() ?? false

  if (variant === 'push') {
    return (
      // overflow-x: clip (et non hidden) → ne crée pas de conteneur de défilement :
      // les en-têtes `position: sticky` des pages restent collants.
      <div style={{ position: 'relative', overflowX: 'clip' }}>
        <AnimatePresence mode="popLayout" initial={false} custom={direction}>
          <PushPage key={screenKey} direction={direction} reduce={reduce} onBack={onBack} background={background}>
            {children}
          </PushPage>
        </AnimatePresence>
      </div>
    )
  }

  const dist = 44
  return (
    <AnimatePresence mode="wait" initial={false} custom={direction}>
      <motion.div
        key={screenKey}
        custom={direction}
        variants={{
          enter: (d: number) => ({ opacity: 0, x: reduce ? 0 : d * dist }),
          center: { opacity: 1, x: 0 },
          exit: (d: number) => ({ opacity: 0, x: reduce ? 0 : d * -dist }),
        }}
        initial="enter"
        animate="center"
        exit="exit"
        transition={{ duration: reduce ? 0.12 : 0.28, ease: [0.32, 0.72, 0, 1] }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}
