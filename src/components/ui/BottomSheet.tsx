'use client'
// ══════════════════════════════════════════════════════════════════
// BottomSheet — feuille du bas partagée (API inchangée : isOpen, onClose,
// children, title, icon).
//  • Desktop (≥ 768 px) : rendu historique, strictement identique.
//  • Mobile (≤ 767 px) : grammaire « Strava / Claude » — panneau gris chaud
//    (--surface-page) radius 24 en haut, poignée, en-tête titre centré gras +
//    bouton rond blanc ×, tirer vers le bas pour fermer, marge safe-area.
//    Dans le panneau, --bg-card2 / --dash-card valent --surface-card : les
//    blocs du contenu deviennent des cartes blanches sur fond gris.
//
// Ce fichier expose aussi le petit kit de feuilles mobiles réutilisé par les
// modales du shell (abonnement, retours, notifications…) : MobileSheet,
// SheetTopBar, SheetCloseBtn, SheetCard, SheetPill, useMobileSafe.
// ══════════════════════════════════════════════════════════════════
import { createPortal } from 'react-dom'
import { useEffect, useState, useRef, type CSSProperties, type ReactNode } from 'react'
import PressPop from '@/components/ui/PressPop'
import { useI18n } from '@/lib/i18n'
import { useSheetGesture } from '@/components/ui/useSheetGesture'
import { IOS_EASE_CSS } from '@/components/ui/motion'

interface BottomSheetProps {
  isOpen: boolean
  onClose: () => void
  children: ReactNode
  title?: string
  icon?: ReactNode
}

// ── Kit mobile ───────────────────────────────────────────────────

const MQ = '(max-width: 767px)'
const FB = 'var(--font-body)'
/** Rayon du haut des feuilles mobiles (24 px). */
export const SHEET_RADIUS = 'calc(var(--r-lg) + 4px) calc(var(--r-lg) + 4px) 0 0'
/** Ombre douce des cartes blanches (quasi invisible en sombre). */
export const SHEET_CARD_SHADOW = '0 1px 3px rgba(0,0,0,0.05)' // design-allow-color — ombre douce de carte
const MAX_H = 'calc(100dvh - max(48px, env(safe-area-inset-top)) - 8px)'
/** Ouverture : ressort iOS un peu plus long (la feuille « se pose ») ; fermeture plus vive. */
const SHEET_OPEN_T = `transform 440ms ${IOS_EASE_CSS}`
const SHEET_CLOSE_T = `transform 280ms ${IOS_EASE_CSS}`

/** Vrai sous 768 px. Démarre à `false` (identique au rendu serveur, sans
 *  écart d'hydratation) puis suit le media query après le montage. */
export function useMobileSafe(): boolean {
  const [m, setM] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia(MQ)
    const f = () => setM(mq.matches)
    f(); mq.addEventListener('change', f)
    return () => mq.removeEventListener('change', f)
  }, [])
  return m
}

/** Bouton rond blanc flottant 44 px (× ou ‹). */
export function SheetCloseBtn({ onClick, label, back }: { onClick: () => void; label: string; back?: boolean }) {
  return (
    <PressPop type="button" onClick={onClick} aria-label={label} title={label} popScale={1.12}
      style={{ width: 44, height: 44, borderRadius: '50%', border: 'none', cursor: 'pointer', flexShrink: 0, padding: 0,
        background: 'var(--float-bg)', color: 'var(--text)', boxShadow: 'var(--shadow-capsule)',
        display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg aria-hidden width={back ? 22 : 20} height={back ? 22 : 20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={back ? 2.2 : 2.4} strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block' }}>
        {back ? <path d="m15 18-6-6 6-6" /> : <path d="M18 6 6 18M6 6l12 12" />}
      </svg>
    </PressPop>
  )
}

/** En-tête de feuille : (‹ rond) · titre centré gras (+ sous-titre) · (× rond | action). */
export function SheetTopBar({ title, sub, icon, onClose, onBack, right, closeLabel, backLabel }: {
  title?: ReactNode; sub?: ReactNode; icon?: ReactNode; onClose?: () => void; onBack?: () => void; right?: ReactNode
  closeLabel?: string; backLabel?: string
}) {
  const { t } = useI18n()
  return (
    <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 10, padding: '6px 16px 10px', fontFamily: FB }}>
      <div style={{ width: 44, flexShrink: 0 }}>
        {onBack && <SheetCloseBtn back onClick={onBack} label={backLabel ?? t('common.back')} />}
      </div>
      <div style={{ flex: 1, minWidth: 0, textAlign: 'center' }}>
        {title && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: 17, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.01em', lineHeight: 1.25 }}>
            {icon && <span aria-hidden style={{ display: 'flex', color: 'var(--text-mid)', flexShrink: 0 }}>{icon}</span>}
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</span>
          </div>
        )}
        {sub && <div style={{ marginTop: 2, fontSize: 13, color: 'var(--text-mid)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sub}</div>}
      </div>
      <div style={{ width: 44, flexShrink: 0, display: 'flex', justifyContent: 'flex-end' }}>
        {right ?? (onClose && <SheetCloseBtn onClick={onClose} label={closeLabel ?? t('w3c.close')} />)}
      </div>
    </div>
  )
}

/** Carte blanche radius 20, sans bordure (contenu des feuilles mobiles). */
export function SheetCard({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return <div style={{ background: 'var(--surface-card)', borderRadius: 'var(--r-lg)', boxShadow: SHEET_CARD_SHADOW, overflow: 'hidden', fontFamily: FB, ...style }}>{children}</div>
}

/** Bouton pilule pleine largeur ≥ 52 px : primary (cyan) | white | ghost | danger. */
export function SheetPill({ children, onClick, variant = 'primary', disabled, type = 'button', style }: {
  children: ReactNode; onClick?: () => void; variant?: 'primary' | 'white' | 'ghost' | 'danger'; disabled?: boolean
  type?: 'button' | 'submit'; style?: CSSProperties
}) {
  const v: CSSProperties = variant === 'primary'
    ? { background: 'var(--primary)', color: 'var(--on-primary)' }
    : variant === 'danger'
      ? { background: 'var(--danger)', color: 'var(--on-primary)' }
      : variant === 'white'
        ? { background: 'var(--surface-card)', color: 'var(--text)', boxShadow: SHEET_CARD_SHADOW }
        : { background: 'transparent', color: 'var(--text-mid)' }
  return (
    <button type={type} onClick={onClick} disabled={disabled}
      style={{ width: '100%', minHeight: variant === 'ghost' ? 44 : 52, borderRadius: 'var(--r-pill)', border: 'none', cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.55 : 1, fontSize: 16, fontWeight: variant === 'ghost' ? 600 : 700, fontFamily: FB, padding: '0 20px',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, ...v, ...style }}>
      {children}
    </button>
  )
}

/** Montage + animation d'entrée/sortie partagés (double rAF puis délai de sortie). */
function usePresence(open: boolean, ms = 320) {
  const [mounted, setMounted] = useState(false)
  const [visible, setVisible] = useState(false)
  const [animIn, setAnimIn] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => { setMounted(true) }, [])
  useEffect(() => {
    if (open) {
      if (timer.current) clearTimeout(timer.current)
      setVisible(true)
      requestAnimationFrame(() => requestAnimationFrame(() => setAnimIn(true)))
    } else {
      setAnimIn(false)
      timer.current = setTimeout(() => setVisible(false), ms)
    }
    return () => { if (timer.current) clearTimeout(timer.current) }
  }, [open, ms])
  return { mounted, visible, animIn }
}

export interface MobileSheetProps {
  open: boolean
  onClose: () => void
  children: ReactNode
  title?: ReactNode
  sub?: ReactNode
  icon?: ReactNode
  /** Bouton rond ‹ à gauche (sous-vue). */
  onBack?: () => void
  /** Remplace le bouton × de droite. */
  right?: ReactNode
  /** Masque le bouton × (le contenu gère sa propre sortie). */
  hideClose?: boolean
  /** Zone fixe en bas (bouton principal), au-dessus de la safe-area. */
  footer?: ReactNode
  /** Hauteur maximale d'emblée (listes longues). */
  full?: boolean
  /** Le voile ou le geste ne ferment pas (ex. paiement en cours). */
  locked?: boolean
  zIndex?: number
  label?: string
  /** Fond du panneau : gris chaud (défaut) ou blanc. */
  surface?: 'page' | 'card'
  bodyStyle?: CSSProperties
}

/** Feuille du bas mobile (portail) : voile, panneau gris chaud radius 24,
 *  poignée, en-tête centré, corps défilant, pied fixe optionnel. */
export function MobileSheet({ open, onClose, children, title, sub, icon, onBack, right, hideClose, footer, full, locked, zIndex = 9999, label, surface = 'page', bodyStyle }: MobileSheetProps) {
  const { mounted, visible, animIn } = usePresence(open)
  const close = () => { if (!locked) onClose() }
  const panelRef = useRef<HTMLDivElement>(null)
  const scrimRef = useRef<HTMLDivElement>(null)
  const bodyRef = useRef<HTMLDivElement>(null)
  // Tirer vers le bas (poignée, en-tête, ou contenu déjà en haut) : suit le doigt,
  // voile qui s'estompe, fermeture à la vitesse du geste, élastique vers le haut.
  useSheetGesture({ axis: 'y', panelRef, scrimRef, scrollRef: bodyRef, onClose: close, enabled: mounted && visible && open && !locked, restTransition: SHEET_OPEN_T })

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !locked) onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, locked, onClose])

  if (!mounted || !visible) return null
  const hasHeader = !!(title || icon || onBack || right || !hideClose)

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex, display: 'flex', alignItems: 'flex-end' }}>
      <div ref={scrimRef} aria-hidden onClick={close}
        style={{ position: 'absolute', inset: 0, background: 'var(--scrim)', opacity: animIn ? 1 : 0, transition: 'opacity 300ms cubic-bezier(0.16,1,0.3,1)' }} />
      <div ref={panelRef} role="dialog" aria-modal="true" aria-label={label ?? (typeof title === 'string' ? title : undefined)}
        data-sheet-panel={surface === 'page' ? 'm' : 'mc'}
        style={{
          position: 'relative', width: '100%', borderRadius: SHEET_RADIUS, overflow: 'hidden',
          maxHeight: MAX_H, height: full ? MAX_H : undefined,
          display: 'flex', flexDirection: 'column', boxShadow: 'var(--shadow-float)', fontFamily: FB,
          transform: animIn ? 'translateY(0px)' : 'translateY(100%)',
          transition: animIn ? SHEET_OPEN_T : SHEET_CLOSE_T,
        }}>
        <div style={{ flexShrink: 0, touchAction: 'none' }}>
          <div aria-hidden style={{ display: 'flex', justifyContent: 'center', paddingTop: 8, paddingBottom: hasHeader ? 2 : 10 }}>
            <span style={{ width: 38, height: 5, borderRadius: 'var(--r-pill)', background: 'var(--surface-bar)' }} />
          </div>
          {hasHeader && <SheetTopBar title={title} sub={sub} icon={icon} onBack={onBack} right={right} onClose={hideClose ? undefined : close} />}
        </div>
        <div ref={bodyRef} style={{
          overflowY: 'auto', flex: 1, minHeight: 0, overscrollBehavior: 'contain', WebkitOverflowScrolling: 'touch',
          padding: '4px 16px', paddingBottom: footer ? 16 : 'calc(24px + env(safe-area-inset-bottom))', ...bodyStyle,
        }}>
          {children}
        </div>
        {footer && (
          <div style={{ flexShrink: 0, padding: '10px 16px', paddingBottom: 'calc(12px + env(safe-area-inset-bottom))', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  )
}

// ── BottomSheet (API historique) ─────────────────────────────────

export function BottomSheet({
  isOpen, onClose, children, title, icon
}: BottomSheetProps) {
  const mobile = useMobileSafe()
  if (mobile) {
    return (
      <MobileSheet open={isOpen} onClose={onClose} title={title} icon={icon} hideClose={!title && !icon}>
        {children}
      </MobileSheet>
    )
  }
  return <DesktopBottomSheet isOpen={isOpen} onClose={onClose} title={title} icon={icon}>{children}</DesktopBottomSheet>
}

/** Rendu desktop historique — inchangé. */
function DesktopBottomSheet({
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
        data-sheet-panel=""
        style={{
          position: 'relative', width: '100%',
          borderRadius: '20px 20px 0 0',
          maxHeight: 'calc(100dvh - 72px)',
          display: 'flex', flexDirection: 'column',
          boxShadow: '0 -8px 40px rgba(0,0,0,0.15)',
          paddingBottom: 'env(safe-area-inset-bottom, 20px)',
          transform: animIn ? 'translateY(0)' : 'translateY(100%)',
          transition: 'transform 300ms cubic-bezier(0.32,0.72,0,1)',
          /* PAS DE backgroundColor ICI — géré par globals.css */
        }}
      >
        {/* Drag handle */}
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 12, paddingBottom: 4, flexShrink: 0 }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(148,163,184,0.3)' }} />
        </div>

        {/* Header optionnel */}
        {(title || icon) && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 20px 8px', flexShrink: 0 }}>
            {icon && <span style={{ color: 'var(--primary)', display: 'flex' }}>{icon}</span>}
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
