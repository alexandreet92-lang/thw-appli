'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { usePathname } from 'next/navigation'

/**
 * Transition de route : FONDU léger uniquement (opacity), court.
 *
 * ⚠️ Perf WebView iOS : animer un `transform: translateX` sur TOUTE la page à
 * chaque navigation est coûteux (surtout sur les pages lourdes comme /activities)
 * et `mode="wait"` forçait la page sortante à s'animer AVANT de monter la
 * nouvelle → navigation lente/saccadée. On garde juste un fondu d'opacité rapide
 * (bien moins coûteux) et on laisse la nouvelle page monter immédiatement.
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <AnimatePresence initial={false}>
      <motion.div
        key={pathname}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.14, ease: 'easeOut' }}
        style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}
