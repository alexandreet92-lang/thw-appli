'use client'
// Conteneur d'une vue détail mobile : arrive de la droite (comme un push
// iOS), lien « ‹ Retour » en tête. Respecte prefers-reduced-motion.
import { motion, useReducedMotion } from 'motion/react'

export function DetailSlide({ backLabel, onBack, children }: { backLabel: string; onBack: () => void; children: React.ReactNode }) {
  const reduce = useReducedMotion()
  return (
    <motion.div
      initial={reduce ? false : { x: '100%' }}
      animate={{ x: 0 }}
      transition={{ duration: 0.34, ease: [0.32, 0.72, 0, 1] }}
      style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
    >
      <button type="button" onClick={onBack}
        style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: 2, border: 'none', background: 'none', padding: 0, cursor: 'pointer', fontSize: 15, fontWeight: 600, color: 'var(--primary)', fontFamily: 'inherit' }}>
        <svg aria-hidden width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
        {backLabel}
      </button>
      {children}
    </motion.div>
  )
}
