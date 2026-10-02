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
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useI18n } from '@/lib/i18n'
import { SheetCloseBtn, useMobileSafe } from '@/components/ui/BottomSheet'
import { useSheetGesture } from '@/components/ui/useSheetGesture'
import { IOS_EASE_CSS } from '@/components/ui/motion'

/** Push iOS : ~350 ms à l'ouverture, un peu plus vif à la fermeture. */
const SLIDE_OPEN_T = `transform 360ms ${IOS_EASE_CSS}`
const SLIDE_CLOSE_T = `transform 280ms ${IOS_EASE_CSS}`

interface Props {
  open: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
}

export default function SlideSheet({ open, onClose, title, children }: Props) {
  const { t } = useI18n()
  const mobile = useMobileSafe()
  const [mounted, setMounted] = useState(false)
  const [shown, setShown] = useState(false)   // pilote la transition
  const panelRef = useRef<HTMLDivElement>(null)
  const scrimRef = useRef<HTMLDivElement>(null)
  // Glisser depuis le bord gauche : la surpage suit le doigt, le voile s'estompe,
  // retour à la vitesse du geste (flick) ou retour en place.
  useSheetGesture({ axis: 'x', panelRef, scrimRef, onClose, enabled: mobile && mounted && open, restTransition: SLIDE_OPEN_T, edge: 40 })

  useEffect(() => {
    if (open) {
      setMounted(true)
      // Double rAF : le panneau est peint hors écran avant de glisser (sinon pas d'animation).
      let r2 = 0
      const r1 = requestAnimationFrame(() => { r2 = requestAnimationFrame(() => setShown(true)) })
      return () => { cancelAnimationFrame(r1); cancelAnimationFrame(r2) }
    }
    setShown(false)
    const t = setTimeout(() => setMounted(false), 300)   // attend la fin de l'anim
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
    return createPortal(
      <div style={{ position: 'fixed', inset: 0, zIndex: 14000 }}>
        <div ref={scrimRef} onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'var(--scrim)', opacity: shown ? 1 : 0, transition: 'opacity 300ms ease' }} />
        <div ref={panelRef} data-slide-sheet="m" style={{
          position: 'absolute', inset: 0, background: 'var(--surface-page)', display: 'flex', flexDirection: 'column', fontFamily: 'var(--font-body)',
          transform: shown ? 'translateX(0px)' : 'translateX(100%)',
          transition: shown ? SLIDE_OPEN_T : SLIDE_CLOSE_T,
          boxShadow: 'var(--page-edge-shadow)', touchAction: 'pan-y',
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
