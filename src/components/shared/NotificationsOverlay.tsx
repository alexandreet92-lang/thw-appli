'use client'
// Surpage Notifications — overlay centré (scale .92→1) ouvert par la cloche du header, sans
// quitter la page courante. La route /notifications reste disponible. createPortal +
// tokens de thème (jour/nuit). Clic sur le fond ou ✕ = fermeture.
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

const FD = 'var(--font-display)'

export function NotificationsOverlay({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [shown, setShown] = useState(false)
  useEffect(() => { const t = setTimeout(() => setShown(open), 10); return () => clearTimeout(t) }, [open])
  if (!open || typeof document === 'undefined') return null

  return createPortal(
    <div onClick={e => { if (e.target === e.currentTarget) onClose() }}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, opacity: shown ? 1 : 0, transition: 'opacity .25s', padding: 16 }}>
      <div style={{ background: 'var(--bg-card)', borderRadius: 20, width: 'min(480px, 94vw)', maxHeight: '80vh', overflowY: 'auto', padding: '24px 26px', border: '1px solid var(--border)', boxShadow: '0 24px 60px rgba(0,0,0,.18)', transform: shown ? 'scale(1)' : 'scale(0.92)', transition: 'transform .3s cubic-bezier(.2,.8,.2,1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <span style={{ fontFamily: FD, fontWeight: 600, fontSize: 18, color: 'var(--text)' }}>Notifications</span>
          <button onClick={onClose} aria-label="Fermer" style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--bg-card2)', border: 'none', cursor: 'pointer', fontSize: 14, color: 'var(--text-mid)' }}>✕</button>
        </div>
        <div style={{ textAlign: 'center', padding: '24px 0' }}>
          <p style={{ margin: 0, fontFamily: FD, fontSize: 16, fontWeight: 500, color: 'var(--text)' }}>Rien de neuf pour l&apos;instant</p>
          <p style={{ margin: '6px 0 0', fontSize: 13, color: 'var(--text-mid)', lineHeight: 1.6 }}>Tes alertes (séances, objectifs, rappels) apparaîtront ici.</p>
        </div>
      </div>
    </div>,
    document.body
  )
}
