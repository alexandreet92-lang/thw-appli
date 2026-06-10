'use client'
// Feuille coulissante (bottom sheet) via createPortal sur document.body.
// Animation slide-up (sheet-open, respecte prefers-reduced-motion globalement).
import { createPortal } from 'react-dom'

const FD = 'var(--font-display)'

export function Sheet({ title, onClose, children, footer }: {
  title: string; onClose: () => void; children: React.ReactNode; footer?: React.ReactNode
}) {
  return createPortal(
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 3000 }}>
      <div style={{ position: 'fixed', inset: 0, background: 'var(--text)', opacity: 0.32 }} />
      <div onClick={e => e.stopPropagation()} style={{
        position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 1, margin: '0 auto', maxWidth: 600,
        maxHeight: '92vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-card)',
        borderRadius: 'var(--r-lg) var(--r-lg) 0 0', animation: 'sheet-open 300ms cubic-bezier(0.16,1,0.3,1) both',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'var(--space-5) var(--space-6) var(--space-3)', flexShrink: 0 }}>
          <h2 style={{ fontFamily: FD, fontSize: 18, fontWeight: 600, color: 'var(--text)', margin: 0 }}>{title}</h2>
          <button onClick={onClose} aria-label="Fermer" style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-dim)', padding: 4, display: 'flex' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
          </button>
        </div>
        <div style={{ overflowY: 'auto', padding: '0 var(--space-6) var(--space-6)', flex: 1 }}>{children}</div>
        {footer && <div style={{ padding: 'var(--space-4) var(--space-6)', flexShrink: 0 }}>{footer}</div>}
      </div>
    </div>,
    document.body,
  )
}

// Bouton primaire compact réutilisé par les feuilles.
export const primaryBtn: React.CSSProperties = {
  height: 40, padding: '0 18px', border: 'none', borderRadius: 'var(--r-sm)',
  background: 'var(--primary)', color: 'var(--on-primary)', fontFamily: 'var(--font-body)',
  fontSize: 13, fontWeight: 600, cursor: 'pointer', width: '100%',
}
