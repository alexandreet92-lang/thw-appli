'use client'
// Feuille coulissante (bottom sheet) via createPortal sur document.body.
// RÈGLE : animation slide-up à l'ouverture ET slide-down à la fermeture (voile flou
// en fondu). Toute fermeture (voile, croix, glissement) passe par requestClose.
import { useCallback, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useI18n } from '@/lib/i18n'

const FD = 'var(--font-display)'

export function Sheet({ title, onClose, children, footer }: {
  title: string; onClose: () => void; children: React.ReactNode; footer?: React.ReactNode
}) {
  const { t } = useI18n()
  const [closing, setClosing] = useState(false)
  const startY = useRef<number | null>(null)
  const requestClose = useCallback(() => { setClosing(true); setTimeout(onClose, 260) }, [onClose])

  return createPortal(
    <div onClick={requestClose} style={{ position: 'fixed', inset: 0, zIndex: 3000 }}>
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)' /* design-allow-color: voile de modale standard */, backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)',
        animation: `${closing ? 'fadeOutOverlay' : 'fadeInOverlay'} 260ms ease both` }} />
      <div onClick={e => e.stopPropagation()}
        onTouchStart={e => { startY.current = e.touches[0].clientY }}
        onTouchEnd={e => { if (startY.current != null && e.changedTouches[0].clientY - startY.current > 60) requestClose() }}
        style={{
          position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 1, margin: '0 auto', maxWidth: 600,
          maxHeight: '92vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-card)',
          borderRadius: 'var(--r-lg) var(--r-lg) 0 0', animation: `${closing ? 'sheet-close' : 'sheet-open'} 280ms cubic-bezier(0.16,1,0.3,1) both`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'var(--space-5) var(--space-6) var(--space-3)', flexShrink: 0 }}>
          <h2 style={{ fontFamily: FD, fontSize: 18, fontWeight: 600, color: 'var(--text)', margin: 0 }}>{title}</h2>
          <button onClick={requestClose} aria-label={t('injuries.close')} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-dim)', padding: 4, display: 'flex' }}>
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
