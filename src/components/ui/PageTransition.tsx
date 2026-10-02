'use client'

import { useEffect, useRef } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'motion/react'
import { usePathname } from 'next/navigation'
import { takeNavDirection, type NavDirection } from '@/lib/nav/direction'
import { takeTabSlide, IOS_EASE, OUT_EASE } from '@/components/ui/motion'

/** Mode de transition figé pour UN changement de route. */
type Mode =
  | { kind: 'push' }            // détail : arrive de la droite, l'ancienne recule (parallaxe)
  | { kind: 'back' }            // retour : sens inverse
  | { kind: 'tab'; d: 1 | -1 }  // sous-onglet (MobileSectionTabs) : glissement latéral court
  | { kind: 'fade' }            // onglet du bas : fondu + légère montée

/**
 * Transition de route.
 *  • Ouverture d'un détail (setNavDirection('push'), ex. tap sur une carte) :
 *    la nouvelle page GLISSE de la droite, l'ancienne recule de 30 % (parallaxe
 *    façon iOS), ressort cubic-bezier(.32,.72,0,1) ~350 ms.
 *  • Retour (bouton/geste du navigateur) : sens inverse ; la page qui part reste
 *    au-dessus et sort par la droite.
 *  • `mobile` (MobileShell uniquement) :
 *     – onglet du bas : fondu croisé doux + montée de 10 px ;
 *     – sous-onglet : glissement latéral de 28 px dans le sens de l'onglet.
 *    Desktop : fondu + 14 px (inchangé).
 * `mode="popLayout"` : la page sortante est retirée du flux et animée par-dessus.
 * Uniquement transform / opacity (60 fps) ; reduced-motion → aucun mouvement.
 * `mobile` ajoute aussi l'espaceur de bas de page (.thw-tabbar-spacer).
 */
export function PageTransition({ children, mobile = false }: { children: React.ReactNode; mobile?: boolean }) {
  const pathname = usePathname()
  const reduce = useReducedMotion() ?? false
  const popRef = useRef(false)
  const modeRef = useRef<{ path: string; mode: Mode }>({ path: pathname, mode: { kind: 'fade' } })

  useEffect(() => {
    const onPop = () => { popRef.current = true }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  // Mode figé pour CE changement de route (lu une seule fois par route).
  if (modeRef.current.path !== pathname) {
    const explicit: NavDirection = takeNavDirection()
    const tab = takeTabSlide()
    const mode: Mode = popRef.current || explicit === 'back' ? { kind: 'back' }
      : explicit === 'push' ? { kind: 'push' }
      : mobile && tab ? { kind: 'tab', d: tab }
      : { kind: 'fade' }
    modeRef.current = { path: pathname, mode }
    popRef.current = false
  }
  const mode: Mode = reduce ? { kind: 'fade' } : modeRef.current.mode
  const slide = mode.kind === 'push' || mode.kind === 'back'

  const variants = {
    enter: (m: Mode) => {
      if (reduce) return { opacity: 0 }
      switch (m.kind) {
        case 'push': return { x: '100%', y: 0, opacity: 1, zIndex: 1 }
        case 'back': return { x: '-30%', y: 0, opacity: 1, zIndex: 0 }
        case 'tab':  return { x: 28 * m.d, y: 0, opacity: 0 }
        default:     return mobile ? { x: 0, y: 10, opacity: 0 } : { x: 14, y: 0, opacity: 0 }
      }
    },
    // La page revenue (back) repasse en z-index auto au repos (aucun contexte
    // d'empilement résiduel) ; une page poussée garde 1 (comme avant).
    center: (m: Mode) => (m.kind === 'back' ? { x: 0, y: 0, opacity: 1, transitionEnd: { zIndex: 'auto' } } : { x: 0, y: 0, opacity: 1 }),
    exit: (m: Mode) => {
      if (reduce) return { opacity: 0, transition: { duration: 0.12 } }
      switch (m.kind) {
        case 'push': return { x: '-30%', opacity: 1, zIndex: 0 }
        case 'back': return { x: '100%', opacity: 1, zIndex: 1 }
        case 'tab':  return { x: -18 * m.d, opacity: 0, transition: { duration: 0.18, ease: OUT_EASE } }
        default:     return { opacity: 0, transition: { duration: mobile ? 0.14 : 0.12 } }
      }
    },
  }

  const transition = reduce ? { duration: 0.18 }
    : slide ? { duration: 0.35, ease: IOS_EASE, zIndex: { duration: 0 } }
    : mode.kind === 'tab' ? { duration: 0.3, ease: OUT_EASE }
    : { duration: mobile ? 0.32 : 0.25, ease: OUT_EASE }

  return (
    <AnimatePresence initial={false} mode="popLayout" custom={mode}>
      <motion.div
        key={pathname}
        className="thw-page"
        custom={mode}
        variants={variants}
        initial="enter"
        animate="center"
        exit="exit"
        transition={transition}
        style={{
          height: '100%', display: 'flex', flexDirection: 'column', position: 'relative',
          background: slide ? 'var(--bg)' : undefined,
          // Arête d'ombre de la page qui glisse par-dessus (statique, jamais animée).
          boxShadow: mobile && slide ? 'var(--page-edge-shadow)' : undefined,
        }}
      >
        {children}
        {/* Mobile : espace réservé à la barre d'onglets flottante, DANS la page
            (dernier enfant du flux) — un espaceur placé après ce conteneur
            (height 100 %) ne repoussait rien quand le contenu débordait.
            Hauteur = --tabbar-clearance (0 hors [data-tabbar-space]). */}
        {mobile && <div aria-hidden className="thw-tabbar-spacer" />}
      </motion.div>
    </AnimatePresence>
  )
}
