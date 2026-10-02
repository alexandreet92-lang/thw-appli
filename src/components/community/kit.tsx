'use client'
// ══════════════════════════════════════════════════════════════════════════
// Kit UI de la COMMUNAUTÉ et du FIL (maquettes validées mock8 c1/c2/c3) :
// page gris chaud (--surface-page), cartes blanches radius 20, gros titres
// gras, listes groupées façon iOS, boutons ronds flottants, feuilles du bas à
// ressort (tirer vers le bas pour fermer), menu « verre » d'appui long.
//
// Mouvement : transform / opacity uniquement, prefers-reduced-motion respecté
// (CSS + useReducedMotion). Tokens uniquement ; les rares valeurs propres au
// verre / aux ombres sont déclarées UNE fois ici (design-allow-color).
// ══════════════════════════════════════════════════════════════════════════
import {
  createContext, useCallback, useContext, useEffect, useLayoutEffect, useRef, useState,
  type CSSProperties, type ReactNode, type TouchEvent as ReactTouchEvent, type MouseEvent as ReactMouseEvent,
} from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion, useDragControls, useReducedMotion, type PanInfo } from 'motion/react'
import { X, ChevronLeft } from 'lucide-react'
import { haptic } from '@/lib/haptics'
import { useI18n } from '@/lib/i18n'

export const FB = 'var(--font-body)'
export const FD = 'var(--font-display)'
export const PAGE_BG = 'var(--surface-page)'
export const CARD_BG = 'var(--surface-card)'
export const CHIP_BG = 'var(--surface-chip)'
export const SOFT_SHADOW = '0 1px 3px rgba(0,0,0,0.05)' // design-allow-color — ombre douce de carte (maquette)
export const EASE = [0.22, 1, 0.36, 1] as const
export const SHEET_SPRING = { type: 'spring', stiffness: 380, damping: 38, mass: 0.9 } as const
export const TNUM: CSSProperties = { fontVariantNumeric: 'tabular-nums', fontFeatureSettings: "'zero' 0" }

// ── Feuille de style du kit (injectée une fois par vue / portail) ─────────
const CM_CSS = `
:root {
  --cm-menu-bg: rgba(252,252,250,0.94); /* design-allow-color — verre du menu contextuel */
  --cm-menu-sep: rgba(13,17,23,0.08); /* design-allow-color */
  --cm-menu-shadow: 0 18px 50px rgba(0,0,0,0.22); /* design-allow-color */
  --cm-lift-shadow: 0 14px 44px rgba(0,0,0,0.22); /* design-allow-color */
  --cm-blur-scrim: rgba(242,242,240,0.42); /* design-allow-color */
  --cm-press: rgba(13,17,23,0.06); /* design-allow-color */
  --cm-composer-shadow: 0 4px 24px rgba(0,0,0,0.12); /* design-allow-color */
  --cm-float-shadow: 0 6px 22px rgba(0,0,0,0.16); /* design-allow-color */
  --cm-bubble: color-mix(in srgb, var(--text) 7%, transparent);
}
.dark {
  --cm-menu-bg: rgba(40,42,48,0.94); /* design-allow-color */
  --cm-menu-sep: rgba(255,255,255,0.10); /* design-allow-color */
  --cm-menu-shadow: 0 18px 50px rgba(0,0,0,0.55); /* design-allow-color */
  --cm-lift-shadow: 0 14px 44px rgba(0,0,0,0.6); /* design-allow-color */
  --cm-blur-scrim: rgba(0,0,0,0.42); /* design-allow-color */
  --cm-press: rgba(255,255,255,0.07); /* design-allow-color */
  --cm-composer-shadow: 0 0 0 1px var(--border), 0 4px 24px rgba(0,0,0,0.45); /* design-allow-color */
  --cm-float-shadow: 0 6px 22px rgba(0,0,0,0.5); /* design-allow-color */
}
.cm-btn { appearance: none; border: none; background: transparent; color: inherit; font: inherit; cursor: pointer; padding: 0; -webkit-tap-highlight-color: transparent; }
.cm-press { transition: transform .18s cubic-bezier(.2,.8,.2,1); -webkit-tap-highlight-color: transparent; touch-action: manipulation; }
.cm-press:active:not(:disabled) { transform: scale(.97); }
.cm-row { -webkit-tap-highlight-color: transparent; }
.cm-row:active { background: var(--cm-press); }
.cm-scroll { overscroll-behavior: contain; -webkit-overflow-scrolling: touch; scrollbar-width: none; }
.cm-scroll::-webkit-scrollbar { display: none; }
.cm-noselect { -webkit-user-select: none; user-select: none; -webkit-touch-callout: none; }
.cm-in { animation: cmIn .46s cubic-bezier(.22,1,.36,1) both; }
@keyframes cmIn { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: none; } }
.cm-fade { animation: cmFade .3s ease both; }
@keyframes cmFade { from { opacity: 0; } to { opacity: 1; } }
.cm-rise { animation: cmRise .44s cubic-bezier(.2,.9,.25,1.12) both; transform-origin: 100% 100%; }
@keyframes cmRise { from { opacity: 0; transform: translateY(22px) scale(.94); } to { opacity: 1; transform: none; } }
.cm-arrive { animation: cmArrive .4s cubic-bezier(.22,1,.36,1) both; transform-origin: 0 100%; }
@keyframes cmArrive { from { opacity: 0; transform: translateY(10px) scale(.98); } to { opacity: 1; transform: none; } }
.cm-pop { animation: cmPop .42s cubic-bezier(.3,1.7,.5,1); }
@keyframes cmPop { 0% { transform: scale(1); } 40% { transform: scale(1.24); } 100% { transform: scale(1); } }
.cm-push { animation: cmPush .42s cubic-bezier(.32,.72,0,1) both; }
@keyframes cmPush { from { transform: translateX(100%); } to { transform: none; } }
.cm-back { animation: cmBack .38s cubic-bezier(.32,.72,0,1) both; }
@keyframes cmBack { from { transform: translateX(-28%); opacity: .55; } to { transform: none; opacity: 1; } }
.cm-step-next { animation: cmStepNext .36s cubic-bezier(.22,1,.36,1) both; }
@keyframes cmStepNext { from { opacity: 0; transform: translateX(28px); } to { opacity: 1; transform: none; } }
.cm-step-prev { animation: cmStepPrev .36s cubic-bezier(.22,1,.36,1) both; }
@keyframes cmStepPrev { from { opacity: 0; transform: translateX(-28px); } to { opacity: 1; transform: none; } }
.cm-flash { position: relative; }
.cm-flash::after { content: ''; position: absolute; inset: -2px -8px; border-radius: var(--r-md); background: var(--primary-dim); pointer-events: none; animation: cmFlash 1.8s ease both; }
@keyframes cmFlash { 0% { opacity: 0; } 15% { opacity: 1; } 70% { opacity: 1; } 100% { opacity: 0; } }
.cm-shimmer { animation: cmShimmer 1.4s ease-in-out infinite; }
@keyframes cmShimmer { 0%, 100% { opacity: .55; } 50% { opacity: 1; } }
.cm-lp-scrim { position: fixed; inset: 0; background: var(--cm-blur-scrim); touch-action: none; -webkit-backdrop-filter: blur(10px) saturate(1.1); backdrop-filter: blur(10px) saturate(1.1); animation: cmFade .2s ease both; }
.cm-menu { background: var(--cm-menu-bg); border-radius: var(--r-lg); box-shadow: var(--cm-menu-shadow); -webkit-backdrop-filter: blur(24px) saturate(1.6); backdrop-filter: blur(24px) saturate(1.6); }
.cm-mi:active { background: var(--cm-press); }
.cm-input { width: 100%; box-sizing: border-box; background: var(--surface-chip); border: 1px solid transparent; border-radius: var(--r-md); padding: 13px 14px; font-family: var(--font-body); font-size: 16px; color: var(--text); outline: none; }
.cm-input::placeholder { color: var(--text-dim); }
.cm-input:focus { border-color: var(--primary); box-shadow: 0 0 0 3px var(--primary-dim); }
.cm-msg .cm-hover-actions { opacity: 0; transition: opacity .12s ease; }
.cm-msg:hover .cm-hover-actions { opacity: 1; }
@media (hover: none) { .cm-hover-actions { display: none !important; } .cm-msg { -webkit-user-select: none; user-select: none; -webkit-touch-callout: none; } }
.cm-mic-live { animation: cmMic 1.2s ease-in-out infinite; }
@keyframes cmMic { 0%, 100% { opacity: 1; } 50% { opacity: .45; } }
@media (prefers-reduced-motion: reduce) {
  .cm-in, .cm-fade, .cm-rise, .cm-arrive, .cm-pop, .cm-push, .cm-back, .cm-step-next, .cm-step-prev, .cm-shimmer, .cm-lp-scrim, .cm-mic-live { animation: none !important; }
  .cm-flash::after { animation-duration: .01s; }
  .cm-press:active:not(:disabled) { transform: none; }
}
`
export function CmStyles() {
  return <style dangerouslySetInnerHTML={{ __html: CM_CSS }} />
}

/** Décalage d'entrée en cascade (classe `cm-in`). */
export function stagger(i: number, base = 0, step = 34): CSSProperties {
  return { animationDelay: `${base + Math.min(i, 14) * step}ms` }
}

/** Vrai sous 768 px (lu dès le 1er rendu côté client). */
export function useNarrow(): boolean {
  const q = '(max-width: 767px)'
  const [m, setM] = useState(() => typeof window !== 'undefined' && window.matchMedia(q).matches)
  useEffect(() => {
    const mq = window.matchMedia(q)
    const f = () => setM(mq.matches)
    f(); mq.addEventListener('change', f)
    return () => mq.removeEventListener('change', f)
  }, [])
  return m
}

/** Variante sûre pour le rendu serveur : `null` tant que le composant n'est pas
 *  monté (évite tout écart d'hydratation), puis suit le media query. */
export function useNarrowSafe(): boolean | null {
  const [m, setM] = useState<boolean | null>(null)
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)')
    const f = () => setM(mq.matches)
    f(); mq.addEventListener('change', f)
    return () => mq.removeEventListener('change', f)
  }, [])
  return m
}

// ── Vue immersive (mobile) : masque le chrome de l'app ──────────────────────
// Compteur partagé : pendant une transition de page, l'ancienne vue peut se
// démonter APRÈS le montage de la nouvelle — sans compteur, son nettoyage
// réafficherait le chrome par-dessus la nouvelle vue plein écran.
let immersiveCount = 0
function emitImmersive() {
  const on = immersiveCount > 0
  try {
    if (on) document.body.setAttribute('data-immersive', '1')
    else document.body.removeAttribute('data-immersive')
    window.dispatchEvent(new CustomEvent('thw:immersive', { detail: on }))
  } catch { /* ignore */ }
}
export function useImmersive(on: boolean) {
  useEffect(() => {
    if (!on) return
    immersiveCount += 1
    emitImmersive()
    return () => { immersiveCount = Math.max(0, immersiveCount - 1); emitImmersive() }
  }, [on])
}

// ── Avatar (photo, sinon initiale sur teinte stable) ────────────────────────
const AV_TONES = ['var(--sport-gym)', 'var(--sport-run)', 'var(--sport-bike)', 'var(--sport-hyrox)', 'var(--primary)', 'var(--sport-rowing)']
function hashStr(s: string): number { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return Math.abs(h) }
export function toneFor(seed: string): string { return AV_TONES[hashStr(seed || '?') % AV_TONES.length] }

export function CmAvatar({ name, url, size = 36, seed, dim, style }: { name: string; url?: string | null; size?: number; seed?: string; dim?: boolean; style?: CSSProperties }) {
  return (
    <span aria-hidden style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: url ? 'var(--surface-chip)' : toneFor(seed ?? name), color: 'var(--on-primary)', fontFamily: FB, fontWeight: 800,
      fontSize: Math.round(size * 0.4), lineHeight: 1, opacity: dim ? 0.6 : 1, ...style,
    }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {url ? <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (name.trim()[0] ?? '?').toUpperCase()}
    </span>
  )
}

// ── Boutons ─────────────────────────────────────────────────────────────────
/** Bouton rond flottant blanc (retour, recherche, ⋯) — 44 px. */
export function CmRound({ onClick, label, children, size = 44, active, disabled, style }: {
  onClick: () => void; label: string; children: ReactNode; size?: number; active?: boolean; disabled?: boolean; style?: CSSProperties
}) {
  return (
    <button type="button" onClick={() => { haptic('light'); onClick() }} aria-label={label} title={label} disabled={disabled} className="cm-btn cm-press"
      style={{ width: size, height: size, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: active ? 'var(--text)' : 'var(--float-bg)', color: active ? 'var(--bg)' : 'var(--text)', boxShadow: 'var(--shadow-capsule)',
        opacity: disabled ? 0.5 : 1, ...style }}>
      {children}
    </button>
  )
}

type PillVariant = 'primary' | 'chip' | 'dark' | 'ghost' | 'danger' | 'white'
/** Bouton pilule (≥ 44 px). */
export function CmPill({ children, onClick, variant = 'chip', disabled, full, height = 44, style, type = 'button' }: {
  children: ReactNode; onClick?: () => void; variant?: PillVariant; disabled?: boolean; full?: boolean; height?: number; style?: CSSProperties; type?: 'button' | 'submit'
}) {
  const v: Record<PillVariant, CSSProperties> = {
    primary: { background: 'var(--primary)', color: 'var(--on-primary)' },
    chip: { background: 'var(--surface-chip)', color: 'var(--text)' },
    dark: { background: 'var(--text)', color: 'var(--bg)' },
    ghost: { background: 'transparent', color: 'var(--text-mid)' },
    danger: { background: 'var(--danger-soft)', color: 'var(--danger)' },
    white: { background: 'var(--surface-card)', color: 'var(--text)', boxShadow: SOFT_SHADOW },
  }
  return (
    <button type={type} onClick={onClick} disabled={disabled} className="cm-btn cm-press"
      style={{ height, minHeight: 44, padding: '0 18px', borderRadius: 'var(--r-pill)', width: full ? '100%' : undefined,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontFamily: FB, fontSize: 15, fontWeight: 700,
        whiteSpace: 'nowrap', opacity: disabled ? 0.5 : 1, cursor: disabled ? 'default' : 'pointer', ...v[variant], ...style }}>
      {children}
    </button>
  )
}

/** Puce sélectionnable (active = pilule sombre). */
export function CmChip({ children, active, onClick, disabled }: { children: ReactNode; active: boolean; onClick: () => void; disabled?: boolean }) {
  return (
    <button type="button" onClick={() => { haptic('light'); onClick() }} disabled={disabled} aria-pressed={active} className="cm-btn cm-press"
      style={{ minHeight: 40, padding: '0 14px', borderRadius: 'var(--r-pill)', whiteSpace: 'nowrap', fontFamily: FB, fontSize: 14, fontWeight: 700,
        background: active ? 'var(--text)' : 'var(--surface-chip)', color: active ? 'var(--bg)' : 'var(--text-mid)', opacity: disabled ? 0.5 : 1,
        transition: 'transform .18s cubic-bezier(.2,.8,.2,1)' }}>
      {children}
    </button>
  )
}

/** Interrupteur iOS. */
export function CmSwitch({ on, onChange, label, disabled }: { on: boolean; onChange: (v: boolean) => void; label?: string; disabled?: boolean }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} disabled={disabled} onClick={() => { haptic('light'); onChange(!on) }} className="cm-btn"
      style={{ width: 50, height: 30, borderRadius: 'var(--r-pill)', position: 'relative', flexShrink: 0, background: on ? 'var(--primary)' : 'var(--surface-bar)', opacity: disabled ? 0.5 : 1, transition: 'background .2s ease' }}>
      <span style={{ position: 'absolute', top: 3, left: 3, width: 24, height: 24, borderRadius: '50%', background: 'var(--on-primary)', boxShadow: SOFT_SHADOW,
        transform: on ? 'translateX(20px)' : 'none', transition: 'transform .24s cubic-bezier(.3,1.4,.5,1)' }} />
    </button>
  )
}

/** Libellé de section (petites capitales grises). */
export function CmLabel({ children, right, style }: { children: ReactNode; right?: ReactNode; style?: CSSProperties }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '22px 4px 10px', ...style }}>
      <span style={{ flex: 1, fontFamily: FB, fontSize: 12, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-dim)' }}>{children}</span>
      {right}
    </div>
  )
}

/** Carte blanche radius 20. */
export function CmCard({ children, style, className }: { children: ReactNode; style?: CSSProperties; className?: string }) {
  return <div className={className} style={{ background: CARD_BG, borderRadius: 'var(--r-lg)', boxShadow: SOFT_SHADOW, fontFamily: FB, ...style }}>{children}</div>
}

/** Ligne de liste groupée (filet entre lignes). */
export function CmRow({ icon, title, sub, right, onClick, first, danger, style, className, children }: {
  icon?: ReactNode; title?: ReactNode; sub?: ReactNode; right?: ReactNode; onClick?: () => void; first?: boolean; danger?: boolean
  style?: CSSProperties; className?: string; children?: ReactNode
}) {
  const inner = children ?? (
    <>
      {icon}
      <span style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
        {title && <span style={{ display: 'block', fontSize: 16, fontWeight: 650, color: danger ? 'var(--danger)' : 'var(--text)', lineHeight: 1.25, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</span>}
        {sub && <span style={{ display: 'block', fontSize: 13.5, color: 'var(--text-mid)', marginTop: 2, lineHeight: 1.35, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sub}</span>}
      </span>
      {right}
    </>
  )
  const base: CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 12, width: '100%', minHeight: 56, padding: '10px 16px', boxSizing: 'border-box',
    borderTop: first ? 'none' : '1px solid var(--border)', fontFamily: FB, color: 'var(--text)', textAlign: 'left', ...style,
  }
  if (!onClick) return <div className={className} style={base}>{inner}</div>
  return <button type="button" onClick={onClick} className={`cm-btn cm-row ${className ?? ''}`} style={base}>{inner}</button>
}

/** Squelette (jamais de spinner). */
export function CmSkel({ h = 16, w = '100%', r = 'var(--r-sm)', style }: { h?: number | string; w?: number | string; r?: string; style?: CSSProperties }) {
  return <span aria-hidden className="cm-shimmer" style={{ display: 'block', height: h, width: w, borderRadius: r, background: 'var(--surface-chip)', ...style }} />
}

/** État vide = invitation à agir. */
export function CmEmpty({ icon, title, body, action }: { icon?: ReactNode; title: ReactNode; body?: ReactNode; action?: ReactNode }) {
  return (
    <div className="cm-in" style={{ textAlign: 'center', padding: '40px 20px', fontFamily: FB, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
      {icon && <span style={{ width: 64, height: 64, borderRadius: 'var(--r-lg)', background: 'var(--surface-chip)', color: 'var(--text-mid)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 4 }}>{icon}</span>}
      <span style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.01em' }}>{title}</span>
      {body && <span style={{ fontSize: 14, color: 'var(--text-mid)', lineHeight: 1.5, maxWidth: 320 }}>{body}</span>}
      {action && <div style={{ marginTop: 8 }}>{action}</div>}
    </div>
  )
}

/** En-tête plein écran mobile : rond gauche · titre centré (+ sous-titre) · rond(s) droite. */
export function CmHeader({ left, title, sub, right, onTitle }: { left?: ReactNode; title: ReactNode; sub?: ReactNode; right?: ReactNode; onTitle?: () => void }) {
  const t = (
    <>
      <span style={{ display: 'block', fontSize: 18, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.01em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</span>
      {sub && <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 1, fontSize: 12.5, fontWeight: 650, color: 'var(--text-mid)' }}>{sub}</span>}
    </>
  )
  return (
    <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 10, padding: 'max(10px, env(safe-area-inset-top)) 14px 10px', fontFamily: FB }}>
      <div style={{ minWidth: 44, display: 'flex', gap: 8 }}>{left}</div>
      <div style={{ flex: 1, minWidth: 0, textAlign: 'center' }}>
        {onTitle ? <button type="button" onClick={onTitle} className="cm-btn cm-press" style={{ maxWidth: '100%', minHeight: 44 }}>{t}</button> : t}
      </div>
      <div style={{ minWidth: 44, display: 'flex', gap: 8, justifyContent: 'flex-end' }}>{right}</div>
    </div>
  )
}

// ── Feuille du bas (ressort + tirer pour fermer) ────────────────────────────
const SheetCloseCtx = createContext<() => void>(() => {})
/** Ferme la feuille courante AVEC son animation de sortie. */
export function useSheetClose(): () => void { return useContext(SheetCloseCtx) }

export function CmSheet({ onClose, title, sub, onBack, right, children, footer, full, hideHeader, surface = 'page', zIndex = 15000, maxWidth = 540, label, locked, bodyStyle }: {
  onClose: () => void
  title?: ReactNode
  sub?: ReactNode
  onBack?: () => void
  right?: ReactNode
  children: ReactNode | ((close: () => void) => ReactNode)
  footer?: ReactNode | ((close: () => void) => ReactNode)
  full?: boolean
  hideHeader?: boolean
  surface?: 'page' | 'card'
  zIndex?: number
  maxWidth?: number
  label?: string
  locked?: boolean
  bodyStyle?: CSSProperties
}) {
  const { t } = useI18n()
  const narrow = useNarrow()
  const reduce = useReducedMotion() ?? false
  const drag = useDragControls()
  const [open, setOpen] = useState(true)
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])
  const close = useCallback(() => { if (!locked) setOpen(false) }, [locked])
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [close])
  if (!mounted || typeof document === 'undefined') return null

  const bg = surface === 'card' ? CARD_BG : PAGE_BG
  const maxH = narrow ? 'calc(100dvh - max(44px, env(safe-area-inset-top)) - 6px)' : 'calc(100dvh - 80px)'
  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.y > 110 || info.velocity.y > 650) { haptic('light'); close() }
  }
  const header = !hideHeader && (title || onBack || right !== undefined) ? (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 16px 10px' }}>
      <div style={{ width: 40, flexShrink: 0 }}>
        {onBack && (
          <button type="button" onClick={onBack} aria-label={t('common.back')} className="cm-btn cm-press"
            style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--surface-chip)', color: 'var(--text)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ChevronLeft size={20} strokeWidth={2.2} />
          </button>
        )}
      </div>
      <div style={{ flex: 1, minWidth: 0, textAlign: 'center' }}>
        {title && <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.01em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</div>}
        {sub && <div style={{ marginTop: 2, fontSize: 13, color: 'var(--text-mid)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sub}</div>}
      </div>
      <div style={{ width: 40, flexShrink: 0, display: 'flex', justifyContent: 'flex-end' }}>
        {right !== undefined ? right : (
          <button type="button" onClick={close} aria-label={t('w1g.close')} className="cm-btn cm-press"
            style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--surface-chip)', color: 'var(--text-mid)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={18} strokeWidth={2.4} />
          </button>
        )}
      </div>
    </div>
  ) : null

  const body = typeof children === 'function' ? children(close) : children
  const foot = typeof footer === 'function' ? footer(close) : footer

  return createPortal(
    <SheetCloseCtx.Provider value={close}>
      <CmStyles />
      <AnimatePresence onExitComplete={onClose}>
        {open && (
          <motion.div key="scrim" aria-hidden onClick={close}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: reduce ? 0 : 0.26 }}
            style={{ position: 'fixed', inset: 0, zIndex, background: 'var(--scrim)' }} />
        )}
        {open && (
          <div key="wrap" style={{ position: 'fixed', inset: 0, zIndex: zIndex + 1, display: 'flex', alignItems: narrow ? 'flex-end' : 'center', justifyContent: 'center', pointerEvents: 'none' }}>
            <motion.div role="dialog" aria-modal="true" aria-label={label ?? (typeof title === 'string' ? title : undefined)}
              drag={narrow && !locked ? 'y' : false} dragControls={drag} dragListener={false}
              dragConstraints={{ top: 0, bottom: 0 }} dragElastic={{ top: 0, bottom: 0.7 }} onDragEnd={onDragEnd}
              initial={narrow ? { y: '100%' } : { opacity: 0, scale: 0.96, y: 14 }}
              animate={narrow ? { y: 0 } : { opacity: 1, scale: 1, y: 0 }}
              exit={narrow ? { y: '100%' } : { opacity: 0, scale: 0.97, y: 10 }}
              transition={reduce ? { duration: 0 } : narrow ? SHEET_SPRING : { duration: 0.24, ease: EASE }}
              style={{
                pointerEvents: 'auto', position: 'relative', width: '100%', maxWidth: narrow ? undefined : maxWidth,
                height: full ? maxH : undefined, maxHeight: maxH, background: bg, fontFamily: FB,
                borderRadius: narrow ? 'calc(var(--r-lg) + 6px) calc(var(--r-lg) + 6px) 0 0' : 'calc(var(--r-lg) + 4px)',
                boxShadow: 'var(--shadow-float)', display: 'flex', flexDirection: 'column', overflow: 'hidden',
                '--bg-card2': 'var(--surface-card)',
              } as CSSProperties}>
              <div onPointerDown={e => { if (narrow) drag.start(e) }} style={{ flexShrink: 0, touchAction: 'none', cursor: narrow ? 'grab' : undefined }}>
                <div aria-hidden style={{ display: 'flex', justifyContent: 'center', padding: narrow ? '8px 0 6px' : '6px 0 2px' }}>
                  {narrow && <span style={{ width: 38, height: 5, borderRadius: 'var(--r-pill)', background: 'var(--surface-bar)' }} />}
                </div>
                {header}
              </div>
              <div className="cm-scroll" style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '2px 16px', paddingBottom: foot ? 12 : 'calc(24px + env(safe-area-inset-bottom))', ...bodyStyle }}>
                {body}
              </div>
              {foot && (
                <div style={{ flexShrink: 0, padding: '10px 16px', paddingBottom: 'calc(12px + env(safe-area-inset-bottom))', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {foot}
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </SheetCloseCtx.Provider>,
    document.body,
  )
}

// ── Appui long ──────────────────────────────────────────────────────────────
export interface LpRect { top: number; left: number; width: number; height: number }
export function rectOf(el: Element): LpRect { const r = el.getBoundingClientRect(); return { top: r.top, left: r.left, width: r.width, height: r.height } }

/** Appui long (tactile) + clic droit (souris). `consume()` dit si le tap qui
 *  suit doit être ignoré (il terminait un appui long). */
export function useLongPress(onLong: (el: HTMLElement) => void, ms = 430) {
  const st = useRef<{ timer: ReturnType<typeof setTimeout> | null; fired: boolean; x: number; y: number }>({ timer: null, fired: false, x: 0, y: 0 })
  const cancel = () => { if (st.current.timer) { clearTimeout(st.current.timer); st.current.timer = null } }
  useEffect(() => cancel, [])
  return {
    handlers: {
      onTouchStart: (e: ReactTouchEvent<HTMLElement>) => {
        const el = e.currentTarget
        st.current.fired = false; st.current.x = e.touches[0].clientX; st.current.y = e.touches[0].clientY
        cancel()
        st.current.timer = setTimeout(() => { st.current.fired = true; haptic('medium'); onLong(el) }, ms)
      },
      onTouchMove: (e: ReactTouchEvent<HTMLElement>) => {
        const dx = e.touches[0].clientX - st.current.x, dy = e.touches[0].clientY - st.current.y
        if (dx * dx + dy * dy > 100) cancel()
      },
      onTouchEnd: () => cancel(),
      onTouchCancel: () => cancel(),
      onContextMenu: (e: ReactMouseEvent<HTMLElement>) => { e.preventDefault(); if (st.current.fired || st.current.timer) { cancel(); if (!st.current.fired) { st.current.fired = true; haptic('medium'); onLong(e.currentTarget) } return } onLong(e.currentTarget) },
    },
    consume: (): boolean => { if (st.current.fired) { st.current.fired = false; return true } return false },
  }
}

// ── Menu « verre » d'appui long (façon Claude iOS / DrawerConvMenu) ─────────
export interface GlassItem { key: string; icon?: ReactNode; label: ReactNode; onClick: () => void; danger?: boolean; trailing?: ReactNode; keepOpen?: boolean }
export type GlassEntry = GlassItem | 'sep'

const GAP = 10, M_TOP = 54, M_BOTTOM = 24

export function GlassMenu({ rect, preview, top, items, onClose, align = 'left', label, previewRadius = 'var(--r-lg)', instant }: {
  rect: LpRect
  /** Élément pressé, soulevé au-dessus du flou (absent = simple menu déroulant). */
  preview?: ReactNode
  /** Contenu au-dessus des actions (ex. rangée de réactions rapides). */
  top?: ReactNode
  items: GlassEntry[]
  onClose: () => void
  align?: 'left' | 'right'
  label?: string
  previewRadius?: string
  /** Ouvert par un simple tap (pas d'appui long en cours) : le voile ferme tout de suite. */
  instant?: boolean
}) {
  const reduce = useReducedMotion() ?? false
  const menuRef = useRef<HTMLDivElement>(null)
  const prevRef = useRef<HTMLDivElement>(null)
  // Le relâché du doigt qui a OUVERT le menu (appui long) ne doit pas le refermer :
  // le voile n'est « armé » qu'après ce relâché (ou un court délai).
  const armed = useRef(!!instant)
  const [pos, setPos] = useState<{ previewTop: number; menuTop: number; previewMax: number } | null>(null)
  const vw = typeof window !== 'undefined' ? window.innerWidth : 390
  const vh = typeof window !== 'undefined' ? window.innerHeight : 844
  const menuW = Math.min(286, vw - 24)
  const menuLeft = align === 'right'
    ? Math.max(12, Math.min(rect.left + rect.width - menuW, vw - menuW - 12))
    : Math.max(12, Math.min(rect.left, vw - menuW - 12))

  useLayoutEffect(() => {
    const mh = menuRef.current?.offsetHeight ?? 0
    if (!preview) {
      const below = rect.top + rect.height + GAP
      const menuTop = below + mh <= vh - M_BOTTOM ? below : Math.max(M_TOP, rect.top - GAP - mh)
      setPos({ previewTop: rect.top, menuTop, previewMax: 0 })
      return
    }
    const avail = vh - M_TOP - M_BOTTOM - GAP - mh
    const natural = prevRef.current?.scrollHeight || rect.height
    const previewMax = Math.max(48, Math.min(natural, avail, vh * 0.42))
    let previewTop = rect.top
    if (previewTop + previewMax + GAP + mh > vh - M_BOTTOM) previewTop = vh - M_BOTTOM - mh - GAP - previewMax
    previewTop = Math.max(M_TOP, previewTop)
    setPos({ previewTop, menuTop: previewTop + previewMax + GAP, previewMax })
  }, [rect.top, rect.height, vh, items.length, !!preview])

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])
  useEffect(() => {
    if (armed.current) return
    let t1: ReturnType<typeof setTimeout> | null = null
    const arm = () => { t1 = setTimeout(() => { armed.current = true }, 90) }
    window.addEventListener('pointerup', arm, { once: true })
    window.addEventListener('touchend', arm, { once: true })
    const t2 = setTimeout(() => { armed.current = true }, 700)
    return () => { window.removeEventListener('pointerup', arm); window.removeEventListener('touchend', arm); if (t1) clearTimeout(t1); clearTimeout(t2) }
  }, [])
  const fromBackdrop = () => { if (armed.current) onClose() }

  if (typeof document === 'undefined') return null
  const shift = pos ? pos.previewTop - rect.top : 0
  return createPortal(
    <div role="dialog" aria-modal="true" aria-label={label} style={{ position: 'fixed', inset: 0, zIndex: 16000, fontFamily: FB }}>
      <CmStyles />
      <div className="cm-lp-scrim" onClick={fromBackdrop} />
      {preview && <motion.div ref={prevRef} onClick={fromBackdrop}
        initial={reduce ? false : { y: 0, scale: 1 }}
        animate={{ y: shift, scale: reduce ? 1 : 1.025, transition: { duration: reduce ? 0 : 0.3, ease: EASE } }}
        style={{ position: 'fixed', top: rect.top, left: rect.left, width: rect.width, maxHeight: pos?.previewMax ?? rect.height,
          overflow: 'hidden', borderRadius: previewRadius, boxShadow: 'var(--cm-lift-shadow)', background: 'var(--surface-card)', pointerEvents: 'auto' }}>
        {preview}
      </motion.div>}
      <motion.div ref={menuRef} className="cm-menu"
        initial={reduce ? false : { opacity: 0, scale: 0.9 }}
        animate={{ opacity: pos ? 1 : 0, scale: pos ? 1 : 0.9, transition: { duration: 0.22, ease: EASE } }}
        style={{ position: 'fixed', top: pos?.menuTop ?? rect.top + rect.height + GAP, left: menuLeft, width: menuW, padding: '6px 0', overflow: 'hidden',
          visibility: pos ? 'visible' : 'hidden', transformOrigin: align === 'right' ? '90% 0%' : '10% 0%' }}>
        {top}
        {items.map((it, i) => it === 'sep'
          ? <div key={`sep-${i}`} style={{ height: 1, background: 'var(--cm-menu-sep)', margin: '4px 18px' }} />
          : (
            <button key={it.key} type="button" className="cm-btn cm-mi"
              onClick={() => { haptic('light'); it.onClick() }}
              style={{ display: 'flex', alignItems: 'center', gap: 14, width: '100%', minHeight: 48, padding: '0 18px', fontSize: 16, fontWeight: 550, textAlign: 'left',
                color: it.danger ? 'var(--danger)' : 'var(--text)' }}>
              {it.icon && <span style={{ display: 'flex', flexShrink: 0, width: 22, justifyContent: 'center' }}>{it.icon}</span>}
              <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.label}</span>
              {it.trailing}
            </button>
          ))}
      </motion.div>
    </div>,
    document.body,
  )
}

// ── Bandeau d'info éphémère ─────────────────────────────────────────────────
export function CmToast({ text, onDone, ms = 3200 }: { text: string; onDone: () => void; ms?: number }) {
  const done = useRef(onDone)
  done.current = onDone
  useEffect(() => { const id = setTimeout(() => done.current(), ms); return () => clearTimeout(id) }, [text, ms])
  return (
    <div role="status" className="cm-in" style={{ alignSelf: 'center', maxWidth: '100%', padding: '9px 14px', borderRadius: 'var(--r-pill)', background: 'var(--text)', color: 'var(--bg)',
      fontFamily: FB, fontSize: 13.5, fontWeight: 650, boxShadow: 'var(--cm-float-shadow)', textAlign: 'center' }}>
      {text}
    </div>
  )
}

/** Champ avec unité intégrée à droite (DS §3.1). */
export function CmUnitInput({ value, onChange, unit, placeholder, min, max }: {
  value: string | number; onChange: (v: string) => void; unit?: string; placeholder?: string; min?: number; max?: number
}) {
  return (
    <div style={{ position: 'relative' }}>
      <input type="number" inputMode="numeric" value={value} min={min} max={max} placeholder={placeholder} onChange={e => onChange(e.target.value)}
        className="cm-input" style={{ ...TNUM, paddingRight: unit ? 64 : 14 }} />
      {unit && <span style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 14, fontWeight: 650, color: 'var(--text-dim)', pointerEvents: 'none' }}>{unit}</span>}
    </div>
  )
}

/** Pastille radio / case cochée (cercle cyan + coche). */
export function CmCheck({ on }: { on: boolean }) {
  return (
    <span aria-hidden style={{ width: 24, height: 24, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: on ? 'var(--primary)' : 'transparent', boxShadow: on ? 'none' : 'inset 0 0 0 2px var(--surface-bar)', color: 'var(--on-primary)',
      transform: on ? 'scale(1)' : 'scale(0.92)', transition: 'transform .22s cubic-bezier(.3,1.6,.5,1)' }}>
      {on && <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>}
    </span>
  )
}

/** Libellé de champ de formulaire. */
export function CmField({ label, hint, children, style }: { label: ReactNode; hint?: ReactNode; children: ReactNode; style?: CSSProperties }) {
  return (
    <div style={{ marginTop: 18, ...style }}>
      <div style={{ margin: '0 4px 8px', fontFamily: FB, fontSize: 12, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-dim)' }}>{label}</div>
      {children}
      {hint && <div style={{ margin: '7px 4px 0', fontFamily: FB, fontSize: 13, color: 'var(--text-dim)', lineHeight: 1.45 }}>{hint}</div>}
    </div>
  )
}

/** Badge de rôle (créateur / coach / modo) ; « membre » → rien. */
export function RolePill({ role }: { role: string }) {
  const { t } = useI18n()
  const label = role === 'owner' ? t('w1g.roleCreator') : role === 'coach' ? t('w1g.roleCoach') : role === 'admin' ? t('w1g.roleMod') : null
  if (!label) return null
  return <span style={{ flexShrink: 0, fontSize: 11, fontWeight: 800, letterSpacing: '0.04em', textTransform: 'uppercase', padding: '3px 7px', borderRadius: 'var(--r-sm)', color: 'var(--primary)', background: 'var(--primary-dim)' }}>{label}</span>
}

// ── Formats ─────────────────────────────────────────────────────────────────
export function fmtKm(m: number | null | undefined): string | null {
  if (!m || m <= 0) return null
  return m >= 1000 ? `${(m / 1000).toFixed(m >= 100000 ? 0 : 1).replace('.', ',')} km` : `${Math.round(m)} m`
}
export function fmtHms(s: number | null | undefined): string | null {
  if (!s || s <= 0) return null
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = Math.round(s % 60)
  const two = (n: number) => String(n).padStart(2, '0')
  return h > 0 ? `${h}:${two(m)}:${two(sec)}` : `${m}:${two(sec)}`
}
export function fmtPaceKm(sPerKm: number | null | undefined): string | null {
  if (!sPerKm || sPerKm <= 0) return null
  const m = Math.floor(sPerKm / 60), sec = Math.round(sPerKm % 60)
  return `${m}:${String(sec).padStart(2, '0')}/km`
}
