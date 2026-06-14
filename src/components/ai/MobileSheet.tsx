'use client'

// ══════════════════════════════════════════════════════════════
// MobileSheet — surpage coulissante (bottom sheet) pour mobile.
// Backdrop + panneau qui glisse depuis le bas, drag-to-dismiss,
// fermeture au tap backdrop / Échap. Portail sur document.body.
// ══════════════════════════════════════════════════════════════

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

export function MobileSheet({
  title,
  onClose,
  children,
  maxHeight = '84vh',
}: {
  title?: string
  onClose: () => void
  children: React.ReactNode
  maxHeight?: string
}) {
  const panelRef = useRef<HTMLDivElement>(null)
  const drag = useRef<{ startY: number; dy: number } | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  // Drag vers le bas pour refermer
  const onTouchStart = (e: React.TouchEvent) => { drag.current = { startY: e.touches[0].clientY, dy: 0 } }
  const onTouchMove = (e: React.TouchEvent) => {
    if (!drag.current) return
    const dy = e.touches[0].clientY - drag.current.startY
    if (dy <= 0) return
    drag.current.dy = dy
    const el = panelRef.current
    if (el) { el.style.transition = 'none'; el.style.transform = `translateY(${dy}px)` }
  }
  const onTouchEnd = () => {
    const el = panelRef.current
    const dy = drag.current?.dy ?? 0
    drag.current = null
    if (el) el.style.transition = 'transform 0.26s cubic-bezier(0.32,0.72,0,1)'
    if (dy > 110) onClose()
    else if (el) el.style.transform = 'translateY(0px)'
  }

  if (!mounted) return null

  return createPortal(
    <>
      <style>{`
        @keyframes aip_sheet_up { from { transform: translateY(100%); } to { transform: translateY(0); } }
        @keyframes aip_sheet_fade { from { opacity: 0; } to { opacity: 1; } }
      `}</style>
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1400, animation: 'aip_sheet_fade 0.2s ease' }}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        style={{
          position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 1401,
          background: 'var(--bg-card)', color: 'var(--text)',
          borderTopLeftRadius: 24, borderTopRightRadius: 24,
          boxShadow: '0 -10px 44px rgba(0,0,0,0.34)',
          paddingBottom: 'calc(14px + env(safe-area-inset-bottom, 0px))',
          maxHeight, display: 'flex', flexDirection: 'column',
          animation: 'aip_sheet_up 0.30s cubic-bezier(0.32,0.72,0,1)',
        }}
      >
        {/* Poignée + en-tête (zone de drag) */}
        <div onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd} style={{ flexShrink: 0, cursor: 'grab' }}>
          <div style={{ width: 38, height: 4, borderRadius: 2, background: 'var(--border-mid)', margin: '9px auto 2px' }} />
          {title !== undefined && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 16px 8px' }}>
              <span style={{ fontSize: 16, fontWeight: 600, fontFamily: 'DM Sans,sans-serif' }}>{title}</span>
              <button
                onClick={onClose}
                aria-label="Fermer"
                style={{
                  width: 30, height: 30, borderRadius: '50%', border: 'none',
                  background: 'var(--bg-alt)', color: 'var(--text)', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
              </button>
            </div>
          )}
        </div>
        {/* Contenu défilable */}
        <div style={{ overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: '2px 8px 8px' }}>
          {children}
        </div>
      </div>
    </>,
    document.body,
  )
}
