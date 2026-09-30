'use client'
// Entrée d'un bloc : fondu + léger glissement (~250 ms). À poser sur une section
// qui n'est pas déjà animée par la transition de page.
import { motion, useReducedMotion, type HTMLMotionProps } from 'motion/react'
import type { ReactNode } from 'react'

export function Reveal({ delay = 0, y = 12, children, ...rest }: { delay?: number; y?: number; children: ReactNode } & Omit<HTMLMotionProps<'div'>, 'children'>) {
  const reduce = useReducedMotion()
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1], delay }}
      {...rest}
    >
      {children}
    </motion.div>
  )
}
