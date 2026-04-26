'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { usePathname } from 'next/navigation'

const variants = {
  hidden:  { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0  },
  exit:    { opacity: 0, y: -6 },
}

const transition = {
  duration: 0.30,
  ease: [0.16, 1, 0.3, 1] as const,
}

/**
 * Wrap page content in AnimatePresence + motion.div.
 * Keyed by pathname → triggers on every navigation.
 * Place this directly around {children} inside <main> in layout.tsx.
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={pathname}
        initial="hidden"
        animate="visible"
        exit="exit"
        variants={variants}
        transition={transition}
        style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}
