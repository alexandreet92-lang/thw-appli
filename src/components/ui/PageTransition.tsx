'use client'

import { useEffect, useRef } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'motion/react'
import { usePathname } from 'next/navigation'
import { takeNavDirection, type NavDirection } from '@/lib/nav/direction'

const IOS = [0.32, 0.72, 0, 1] as const

/**
 * Transition de route.
 *  • Ouverture d'un détail (setNavDirection('push'), ex. tap sur une carte du Dashboard) :
 *    la nouvelle page GLISSE de la droite vers la gauche, l'ancienne recule de 30 % (façon iOS).
 *  • Retour (bouton/geste du navigateur) : sens inverse.
 *  • Changement d'onglet : léger fondu + 14 px (inchangé).
 * `mode="popLayout"` : la page sortante est retirée du flux et animée par-dessus.
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const reduce = useReducedMotion() ?? false
  const popRef = useRef(false)
  const dirRef = useRef<{ path: string; dir: NavDirection }>({ path: pathname, dir: null })

  useEffect(() => {
    const onPop = () => { popRef.current = true }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  // Direction figée pour CE changement de route (lue une seule fois par route).
  if (dirRef.current.path !== pathname) {
    const explicit = takeNavDirection()
    dirRef.current = { path: pathname, dir: popRef.current ? 'back' : explicit }
    popRef.current = false
  }
  const dir = reduce ? null : dirRef.current.dir

  const variants = {
    enter: (d: NavDirection) => d === 'push' ? { x: '100%', opacity: 1 } : d === 'back' ? { x: '-30%', opacity: 1 } : { x: 14, opacity: 0 },
    center: { x: 0, opacity: 1 },
    exit: (d: NavDirection) => d === 'push' ? { x: '-30%', opacity: 1 } : d === 'back' ? { x: '100%', opacity: 1 } : { opacity: 0, transition: { duration: 0.12 } },
  }

  return (
    <AnimatePresence initial={false} mode="popLayout" custom={dir}>
      <motion.div
        key={pathname}
        className="thw-page"
        custom={dir}
        variants={variants}
        initial="enter"
        animate="center"
        exit="exit"
        transition={dir ? { duration: 0.36, ease: IOS } : { duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
        style={{ height: '100%', display: 'flex', flexDirection: 'column', background: dir ? 'var(--bg)' : undefined, zIndex: dir === 'push' ? 1 : undefined, position: 'relative' }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}
