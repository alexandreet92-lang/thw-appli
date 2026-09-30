'use client'
// ══════════════════════════════════════════════════════════════════
// Listes animées : chaque élément apparaît (fondu + léger glissement) et
// DISPARAÎT de même ; les autres se referment / se réorganisent en douceur.
//
//   <AnimatedList>
//     {items.map((it, i) => <AnimatedItem key={it.id} index={i}>…</AnimatedItem>)}
//   </AnimatedList>
//
// `index` décale l'apparition (effet cascade, plafonné) au premier affichage.
// Respecte « réduire les animations ». Basé sur motion (motion/react).
// ══════════════════════════════════════════════════════════════════
import { AnimatePresence, motion, useReducedMotion, type HTMLMotionProps } from 'motion/react'
import type { ReactNode } from 'react'

const EASE = [0.22, 1, 0.36, 1] as const

export function AnimatedList({ children }: { children: ReactNode }) {
  return <AnimatePresence initial mode="popLayout">{children}</AnimatePresence>
}

export function AnimatedItem({ index = 0, children, ...rest }: { index?: number; children: ReactNode } & Omit<HTMLMotionProps<'div'>, 'children'>) {
  const reduce = useReducedMotion()
  return (
    <motion.div
      layout={reduce ? false : 'position'}
      initial={reduce ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0, transition: { duration: 0.25, ease: EASE, delay: Math.min(index, 8) * 0.03 } }}
      exit={reduce ? { opacity: 0 } : { opacity: 0, x: -16, scale: 0.98, transition: { duration: 0.2, ease: EASE } }}
      {...rest}
    >
      {children}
    </motion.div>
  )
}
