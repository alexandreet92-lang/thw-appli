'use client'
import { createPortal } from 'react-dom'
import { useEffect, useState, useRef, ReactNode } from 'react'

interface BottomSheetProps {
  isOpen: boolean
  onClose: () => void
  children: ReactNode
  title?: string
  icon?: ReactNode
}

export function BottomSheet({
  isOpen, onClose, children, title, icon
}: BottomSheetProps) {
  const [mounted, setMounted]   = useState(false)
  const [visible, setVisible]   = useState(false)
  const [animIn, setAnimIn]     = useState(false)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    if (isOpen) {
      if (closeTimer.current) clearTimeout(closeTimer.current)
      setVisible(true)
      // Double rAF pour déclencher la transition CSS après le montage
      requestAnimationFrame(() => requestAnimationFrame(() => setAnimIn(true)))
    } else {
      setAnimIn(false)
      closeTimer.current = setTimeout(() => setVisible(false), 310)
    }
    return () => {
      if (closeTimer.current) clearTimeout(closeTimer.current)
    }
  }, [isOpen])

  if (!mounted || !visible) return null

  return createPortal(
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        display: 'flex', alignItems: 'flex-end',
      }}
    >
      {/* Overlay */}
      <div
        style={{
          position: 'absolute', inset: 0,
          background: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(4px)',
          opacity: animIn ? 1 : 0,
          transition: 'opacity 300ms cubic-bezier(0.16,1,0.3,1)',
        }}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        style={{
          position: 'relative', width: '100%',
          background: 'var(--background)',
          borderRadius: '24px 24px 0 0',
          maxHeight: '88vh',
          display: 'flex', flexDirection: 'column',
          boxShadow: '0 -8px 40px rgba(0,0,0,0.3)',
          paddingBottom: 'env(safe-area-inset-bottom, 20px)',
          transform: animIn ? 'translateY(0)' : 'translateY(100%)',
          transition: 'transform 300ms cubic-bezier(0.16,1,0.3,1)',
        }}
      >
        {/* Drag handle */}
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 12, paddingBottom: 4, flexShrink: 0 }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(148,163,184,0.3)' }} />
        </div>

        {/* Header optionnel */}
        {(title || icon) && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 20px 8px', flexShrink: 0 }}>
            {icon && <span style={{ color: '#06B6D4', display: 'flex' }}>{icon}</span>}
            {title && (
              <h2 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: 'var(--foreground)' }}>
                {title}
              </h2>
            )}
          </div>
        )}

        {/* Contenu */}
        <div style={{ overflowY: 'auto', flex: 1, padding: '0 20px 24px' }}>
          {children}
        </div>
      </div>
    </div>,
    document.body
  )
}
