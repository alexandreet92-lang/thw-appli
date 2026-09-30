'use client'

import { useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { usePathname } from 'next/navigation'

/**
 * Transition de route : la nouvelle page entre en fondu + léger glissement
 * depuis la droite (≈ 14 px, 250 ms, courbe douce) ; en retour (bouton retour / geste du
 * navigateur) elle vient de la gauche. Volontairement courte et sans décalage
 * pleine largeur : coût GPU faible, même sur les pages lourdes (/activities).
 * Pas de `mode="wait"` : la nouvelle page monte immédiatement.
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const back = useRef(false)

  useEffect(() => {
    const onPop = () => { back.current = true }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])
  // Le drapeau « retour » ne vaut que pour la navigation qui vient de se produire.
  useEffect(() => { const id = window.setTimeout(() => { back.current = false }, 600); return () => window.clearTimeout(id) }, [pathname])

  const from = back.current ? -14 : 14
  return (
    <AnimatePresence initial={false}>
      <motion.div
        key={pathname}
        initial={{ opacity: 0, x: from }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, transition: { duration: 0.12 } }}
        transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
        style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}
