'use client'
// ══════════════════════════════════════════════════════════════════
// ProfileSheet — « Mon Profil » en SUR-PAGE coulissante (bas → haut),
// par-dessus la page courante. Se replie haut → bas (drag de la poignée ou
// tap sur le fond). Réutilise ProfileContent (liste façon Claude + drill-down).
// Mobile uniquement — monté globalement dans MobileShell, ouvert par l'event
// `thw:open-profile`.
// ══════════════════════════════════════════════════════════════════
import { Suspense, useEffect, useRef, useState } from 'react'
import { ProfileContent } from '@/app/profile/page'

export function ProfileSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [mounted, setMounted] = useState(false)
  const [closing, setClosing] = useState(false)
  const sheetRef = useRef<HTMLDivElement>(null)
  const drag = useRef({ active: false, startY: 0, dy: 0 })

  useEffect(() => {
    if (open) { setMounted(true); setClosing(false) }
  }, [open])

  function handleClose() {
    setClosing(true)
    setTimeout(() => { setMounted(false); setClosing(false); onClose() }, 280)
  }

  // Drag de la poignée : suit le doigt, ferme si tiré assez bas.
  function onTouchStart(e: React.TouchEvent) {
    drag.current = { active: true, startY: e.touches[0].clientY, dy: 0 }
    if (sheetRef.current) sheetRef.current.style.transition = 'none'
  }
  function onTouchMove(e: React.TouchEvent) {
    if (!drag.current.active) return
    const dy = Math.max(0, e.touches[0].clientY - drag.current.startY)
    drag.current.dy = dy
    if (sheetRef.current) sheetRef.current.style.transform = `translateY(${dy}px)`
  }
  function onTouchEnd() {
    if (!drag.current.active) return
    drag.current.active = false
    const el = sheetRef.current
    if (el) el.style.transition = 'transform 0.28s cubic-bezier(0.32,0.72,0,1)'
    if (drag.current.dy > 120) handleClose()
    else if (el) el.style.transform = 'translateY(0)'
  }

  if (!mounted) return null

  return (
    <div className="md:hidden" style={{ position: 'fixed', inset: 0, zIndex: 12000 }}>
      <style>{`
        @keyframes profSheetIn { from { transform: translateY(100%) } to { transform: translateY(0) } }
        @keyframes profSheetOut { from { transform: translateY(0) } to { transform: translateY(100%) } }
        @keyframes profScrimIn { from { opacity: 0 } to { opacity: 1 } }
      `}</style>

      {/* Scrim — tap pour replier */}
      <div onClick={handleClose} style={{
        position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(3px)',
        animation: closing ? 'profScrimIn 0.28s reverse forwards' : 'profScrimIn 0.24s ease forwards',
      }} />

      {/* Sur-page */}
      <div
        ref={sheetRef}
        style={{
          position: 'fixed', left: 0, right: 0, bottom: 0,
          top: 'max(56px, calc(env(safe-area-inset-top, 0px) + 44px))',
          background: 'var(--bg)', borderTopLeftRadius: 26, borderTopRightRadius: 26,
          boxShadow: '0 -10px 50px rgba(0,0,0,0.28)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
          animation: closing ? 'profSheetOut 0.28s cubic-bezier(0.32,0.72,0,1) forwards'
                             : 'profSheetIn 0.34s cubic-bezier(0.2,0.8,0.2,1) forwards',
        }}
      >
        {/* Poignée (drag pour replier) */}
        <div onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}
          style={{ display: 'flex', justifyContent: 'center', paddingTop: 10, paddingBottom: 4, flexShrink: 0, cursor: 'grab', touchAction: 'none' }}>
          <div style={{ width: 40, height: 4, borderRadius: 4, background: 'var(--border-mid)' }} />
        </div>

        {/* Corps scrollable — la liste / le drill-down */}
        <div style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch' as React.CSSProperties['WebkitOverflowScrolling'] }}>
          <Suspense fallback={<div style={{ padding: 40, color: 'var(--text-dim)', textAlign: 'center' }}>Chargement…</div>}>
            <ProfileContent />
          </Suspense>
        </div>
      </div>
    </div>
  )
}
