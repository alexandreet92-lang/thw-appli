'use client'

import { useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { usePathname } from 'next/navigation'

/**
 * Transition de route façon iOS : la nouvelle page GLISSE depuis la droite
 * (≈ 26 px + fondu, 0,34 s, courbe douce) ; en retour (bouton retour / geste du
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

  const from = back.current ? -26 : 26
  return (
    <AnimatePresence initial={false}>
      <motion.div
        key={pathname}
        initial={{ opacity: 0, x: from }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
        style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}
