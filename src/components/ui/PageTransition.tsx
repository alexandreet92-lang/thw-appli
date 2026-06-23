'use client'

import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { usePathname } from 'next/navigation'
import { useRef } from 'react'

/**
 * Transition de route : glissement directionnel (mouvement) + fondu.
 * La nouvelle page entre depuis la droite, l'ancienne sort vers la gauche.
 * Le transform est retiré une fois la page posée (containing-block neutre)
 * pour ne pas confiner les overlays position:fixed internes.
 * Respecte prefers-reduced-motion (fondu seul).
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const reduce = useReducedMotion()
  const ref = useRef<HTMLDivElement>(null)

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={pathname}
        ref={ref}
        initial={reduce ? { opacity: 0 } : { opacity: 0, x: 26 }}
        animate={{ opacity: 1, x: 0 }}
        exit={reduce ? { opacity: 0 } : { opacity: 0, x: -26 }}
        transition={{ duration: reduce ? 0.12 : 0.3, ease: [0.32, 0.72, 0, 1] }}
        onAnimationComplete={() => { if (ref.current) ref.current.style.transform = 'none' }}
        style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}
