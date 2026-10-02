'use client'
// Pilule de confirmation (langage RecordKit) — apparition ressort, auto-fermeture.
import { useEffect } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import './kit/recordKit.css'

interface Props {
  message: string
  onDismiss: () => void
  duration?: number
}

export default function Toast({ message, onDismiss, duration = 2400 }: Props) {
  const reduce = useReducedMotion()
  useEffect(() => {
    const t = setTimeout(onDismiss, duration)
    return () => clearTimeout(t)
  }, [onDismiss, duration])
  return (
    <div style={{ position: 'fixed', left: 0, right: 0, bottom: 'calc(96px + env(safe-area-inset-bottom))', zIndex: 9999, display: 'flex', justifyContent: 'center', pointerEvents: 'none' }}>
      <motion.div
        initial={{ opacity: 0, y: reduce ? 0 : 14, scale: reduce ? 1 : 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={reduce ? { duration: 0.12 } : { type: 'spring', stiffness: 420, damping: 30 }}
        className="rk-banner" role="status"
        style={{ animation: 'none', minHeight: 44, padding: '0 18px', fontSize: 15, fontFamily: 'var(--font-body)' }}
      >
        <span className="rk-dot" style={{ background: 'var(--success)' }} />
        {message}
      </motion.div>
    </div>
  )
}
