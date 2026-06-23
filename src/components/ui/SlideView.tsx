'use client'
// Glissement directionnel pour la navigation DRILL-DOWN intra-page
// (tuile → détail → sous-écran). En avant : la vue entre par la droite et
// pousse vers la gauche. Retour : mouvement inverse. Le sens est porté par
// `direction` (1 = avant, -1 = arrière). Respecte prefers-reduced-motion.
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'

interface Props {
  /** Clé unique de l'écran courant — un changement déclenche la transition. */
  screenKey: string
  /** 1 = on avance (entre depuis la droite), -1 = on recule. */
  direction: number
  children: React.ReactNode
}

export function SlideView({ screenKey, direction, children }: Props) {
  const reduce = useReducedMotion()
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
