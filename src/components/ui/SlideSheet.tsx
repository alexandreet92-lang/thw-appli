'use client'
// ══════════════════════════════════════════════════════════════════
// SlideSheet — surpage coulissante plein écran (entre par la droite).
// createPortal sur document.body. Fermeture : bouton, backdrop, Échap.
//  • Desktop : rendu historique (en-tête translucide flottant).
//  • Mobile (≤ 767 px) : page gris chaud (--surface-page), en-tête collant
//    bouton rond blanc ‹ · titre centré gras, glisser depuis le bord gauche
//    pour revenir. --bg-card2 / --dash-card valent --surface-card dans la
//    surpage : les blocs du contenu deviennent des cartes blanches.
// ══════════════════════════════════════════════════════════════════
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useSwipeBack } from '@/hooks/useSwipeBack'
import { useI18n } from '@/lib/i18n'
import { SheetCloseBtn, useMobileSafe } from '@/components/ui/BottomSheet'

interface Props {
  open: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
}

export default function SlideSheet({ open, onClose, title, children }: Props) {
  const { t } = useI18n()
  const mobile = useMobileSafe()
  const swipe = useSwipeBack(onClose)
  const [mounted, setMounted] = useState(false)
  const [shown, setShown] = useState(false)   // pilote la transition

  useEffect(() => {
    if (open) {
      setMounted(true)
      const t = requestAnimationFrame(() => setShown(true))
      return () => cancelAnimationFrame(t)
    }
    setShown(false)
    const t = setTimeout(() => setMounted(false), 280)   // attend la fin de l'anim
    return () => clearTimeout(t)
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prev }
  }, [open, onClose])

  if (!mounted || typeof document === 'undefined') return null

  if (mobile) {
    const dragging = swipe.dragX > 0
    return createPortal(
      <div style={{ position: 'fixed', inset: 0, zIndex: 14000 }}>
        <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'var(--scrim)', opacity: shown ? 1 : 0, transition: 'opacity 240ms ease' }} />
        <div data-slide-sheet="m" {...swipe.handlers} style={{
          position: 'absolute', inset: 0, background: 'var(--surface-page)', display: 'flex', flexDirection: 'column', fontFamily: 'var(--font-body)',
          transform: shown ? `translateX(${swipe.dragX}px)` : 'translateX(100%)',
          transition: dragging ? 'none' : 'transform 280ms cubic-bezier(0.32, 0.72, 0, 1)',
          boxShadow: 'var(--shadow-float)', touchAction: 'pan-y',
        }}>
          {/* En-tête collant : rond ‹ · titre centré gras · espace. */}
          <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 10, padding: 'calc(env(safe-area-inset-top, 0px) + 8px) 16px 10px', background: 'var(--surface-page)' }}>
            <SheetCloseBtn back onClick={onClose} label={t('common.back')} />
            <div style={{ flex: 1, minWidth: 0, textAlign: 'center', fontSize: 19, fontWeight: 800, letterSpacing: '-0.01em', color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {title}
            </div>
            <div aria-hidden style={{ width: 44, flexShrink: 0 }} />
          </div>
          <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain', paddingBottom: 'calc(24px + env(safe-area-inset-bottom, 0px))' }}>
            {children}
          </div>
        </div>
      </div>,
      document.body,
    )
  }

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 14000 }}>
      {/* Backdrop */}
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', opacity: shown ? 1 : 0, transition: 'opacity 240ms ease' }} />
      {/* Panneau plein écran */}
      <div style={{
        position: 'absolute', inset: 0, background: 'var(--bg)', display: 'flex', flexDirection: 'column',
        transform: shown ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 280ms cubic-bezier(0.32, 0.72, 0, 1)',
        boxShadow: '-20px 0 60px rgba(0,0,0,0.18)',
      }}>
        {/* Contenu défilable PLEIN ÉCRAN : il passe SOUS l'en-tête translucide
            (façon page connexion) — pas de bande opaque en haut. */}
        <div style={{ position: 'absolute', inset: 0, overflowY: 'auto', WebkitOverflowScrolling: 'touch', paddingTop: 'calc(env(safe-area-inset-top, 0px) + 64px)' }}>
          {children}
        </div>
        {/* En-tête flottant translucide : dégradé bg → transparent (le contenu se
            fond dessous). Le bouton retour reste net et lisible. */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 2, display: 'flex', alignItems: 'center', gap: 12, padding: 'calc(env(safe-area-inset-top, 0px) + 12px) clamp(16px,4vw,32px) 22px', pointerEvents: 'none', background: 'linear-gradient(to bottom, var(--bg) 42%, transparent)' }}>
          <button onClick={onClose} aria-label="Fermer" style={{ width: 40, height: 40, borderRadius: 'var(--r-md)', border: '1px solid var(--glass-border)', background: 'var(--glass-bg)', backdropFilter: 'blur(20px) saturate(1.4)', WebkitBackdropFilter: 'blur(20px) saturate(1.4)', color: 'var(--text)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, pointerEvents: 'auto' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
          </button>
          {title && <div style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 600, color: 'var(--text)', pointerEvents: 'auto' }}>{title}</div>}
        </div>
      </div>
    </div>,
    document.body,
  )
}
