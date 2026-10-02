'use client'
// ══════════════════════════════════════════════════════════════
// Primitives MOBILE (≤ 767 px) des feuilles et formulaires Blessures +
// Performance (Mon profil / Tests) — grammaire Strava / Claude :
// fond gris chaud (--surface-page), cartes blanches radius 20 sans bordure,
// Inter seule, libellés gris en casse de phrase, champs « doux » remplis
// (--surface-chip, sans bordure, ≥ 44 px), pilules (active = pilule sombre),
// jauges piste + pouce blanc rond, actions principales en pilule cyan.
// Tokens uniquement (clair / sombre gérés par globals.css). Le rendu
// desktop n'utilise JAMAIS ces primitives.
// ══════════════════════════════════════════════════════════════

import { useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { FB, SOFT_SHADOW, RoundBtn, Ico, ICON, PillButton, SegTrack, useIsMobile } from '@/components/ai/mobile/MobileKit'

export { FB, SOFT_SHADOW, PillButton, SegTrack, useIsMobile, Ico, ICON }

export const PAGE = 'var(--surface-page)'
export const CARD = 'var(--surface-card)'
export const CHIP = 'var(--surface-chip)'
export const LINE = 'var(--border)'
export const NUM: CSSProperties = { fontVariantNumeric: 'tabular-nums', fontFeatureSettings: "'zero' 0" }
/** Pouce de jauge : blanc dans les deux thèmes (maquette validée). */
const THUMB_BG = '#ffffff' // design-allow-color — pouce blanc de la jauge (maquette clair + sombre)
const THUMB_SHADOW = '0 1px 6px rgba(0,0,0,0.25)' // design-allow-color — ombre du pouce de jauge

/** Champ « doux » : fond gris rempli, sans bordure, 48 px, texte 16 px (pas de zoom iOS). */
export const softField: CSSProperties = {
  width: '100%', boxSizing: 'border-box', minHeight: 48, padding: '0 14px', border: 'none', outline: 'none',
  borderRadius: 'var(--r-md)', background: CHIP, color: 'var(--text)', fontFamily: FB, fontSize: 16,
  WebkitAppearance: 'none', appearance: 'none',
}

// ── Carte blanche ───────────────────────────────────────────────
export function MBlock({ title, sub, icon, right, children, style, pad = 16 }: {
  title?: ReactNode; sub?: ReactNode; icon?: ReactNode; right?: ReactNode; children?: ReactNode; style?: CSSProperties; pad?: number
}) {
  return (
    <section style={{ background: CARD, borderRadius: 'var(--r-lg)', padding: pad, boxShadow: SOFT_SHADOW, fontFamily: FB, minWidth: 0, ...style }}>
      {(title || right) && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: children ? 12 : 0 }}>
          {icon && <span aria-hidden style={{ display: 'flex', flexShrink: 0, color: 'var(--text-mid)' }}>{icon}</span>}
          <div style={{ flex: 1, minWidth: 0 }}>
            {title && <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: 'var(--text)', lineHeight: 1.25, letterSpacing: '-0.01em' }}>{title}</h3>}
            {sub && <p style={{ margin: '2px 0 0', fontSize: 13, color: 'var(--text-mid)', lineHeight: 1.4 }}>{sub}</p>}
          </div>
          {right}
        </div>
      )}
      {children}
    </section>
  )
}

/** Libellé gris (casse de phrase) au-dessus d'un contrôle. */
export function MLabel({ children, right, style }: { children: ReactNode; right?: ReactNode; style?: CSSProperties }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8, margin: '0 0 8px', ...style }}>
      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-mid)', fontFamily: FB }}>{children}</span>
      {right}
    </div>
  )
}

/** Bloc libellé + contrôle (espacement vertical régulier dans une carte). */
export function MField({ label, right, children, last }: { label: ReactNode; right?: ReactNode; children: ReactNode; last?: boolean }) {
  return (
    <div style={{ marginBottom: last ? 0 : 16 }}>
      <MLabel right={right}>{label}</MLabel>
      {children}
    </div>
  )
}

/** Ligne de liste groupée (filet encarté au-dessus sauf la première). */
export function MRow({ first, onClick, children, style, label, align = 'center' }: {
  first?: boolean; onClick?: () => void; children: ReactNode; style?: CSSProperties; label?: string; align?: 'center' | 'flex-start'
}) {
  const base: CSSProperties = {
    position: 'relative', display: 'flex', alignItems: align, gap: 12, width: '100%', boxSizing: 'border-box',
    minHeight: 52, padding: '10px 0', textAlign: 'left', fontFamily: FB, color: 'var(--text)', ...style,
  }
  const rule = first ? null : <span aria-hidden style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: LINE }} />
  if (!onClick) return <div style={base}>{rule}{children}</div>
  return (
    <button type="button" onClick={onClick} aria-label={label} style={{ ...base, border: 'none', background: 'transparent', cursor: 'pointer' }}>
      {rule}{children}
    </button>
  )
}

/** Texte de ligne : titre 16 + sous-titre gris 13. */
export function MRowText({ title, sub, dim }: { title: ReactNode; sub?: ReactNode; dim?: boolean }) {
  return (
    <span style={{ flex: 1, minWidth: 0, display: 'block' }}>
      <span style={{ display: 'block', fontSize: 16, fontWeight: 600, color: dim ? 'var(--text-dim)' : 'var(--text)', lineHeight: 1.3 }}>{title}</span>
      {sub && <span style={{ display: 'block', fontSize: 13, color: 'var(--text-mid)', marginTop: 2, lineHeight: 1.4 }}>{sub}</span>}
    </span>
  )
}

// ── Champs doux ─────────────────────────────────────────────────
export function SoftInput({ value, onChange, placeholder, unit, type = 'text', inputMode, onBlur, align = 'left', width, ariaLabel, step }: {
  value: string | number; onChange: (v: string) => void; placeholder?: string; unit?: string | null
  type?: 'text' | 'number' | 'date'; inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode']
  onBlur?: () => void; align?: 'left' | 'right'; width?: number | string; ariaLabel?: string; step?: number
}) {
  const [foc, setFoc] = useState(false)
  const padR = unit ? 14 + Math.max(2, unit.length) * 8 + 6 : 14
  return (
    <div style={{ position: 'relative', width: width ?? '100%', flexShrink: width ? 0 : undefined, minWidth: 0 }}>
      <input type={type} value={value} placeholder={placeholder} inputMode={inputMode} step={step} aria-label={ariaLabel}
        onChange={e => onChange(e.target.value)}
        onFocus={() => setFoc(true)} onBlur={() => { setFoc(false); onBlur?.() }}
        style={{ ...softField, ...NUM, textAlign: align, paddingRight: padR, boxShadow: foc ? '0 0 0 2px var(--primary)' : 'none', transition: 'box-shadow 0.15s ease' }} />
      {unit && <span aria-hidden style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 15, color: 'var(--text-mid)', pointerEvents: 'none', fontFamily: FB }}>{unit}</span>}
    </div>
  )
}

export function SoftTextarea({ value, onChange, placeholder, rows = 3, ariaLabel }: { value: string; onChange: (v: string) => void; placeholder?: string; rows?: number; ariaLabel?: string }) {
  const [foc, setFoc] = useState(false)
  return (
    <textarea value={value} rows={rows} placeholder={placeholder} aria-label={ariaLabel} onChange={e => onChange(e.target.value)}
      onFocus={() => setFoc(true)} onBlur={() => setFoc(false)}
      style={{ ...softField, padding: '12px 14px', minHeight: 96, resize: 'vertical', lineHeight: 1.45, boxShadow: foc ? '0 0 0 2px var(--primary)' : 'none' }} />
  )
}

export function SoftSelect({ value, onChange, children, ariaLabel }: { value: string; onChange: (v: string) => void; children: ReactNode; ariaLabel?: string }) {
  return (
    <div style={{ position: 'relative' }}>
      <select value={value} onChange={e => onChange(e.target.value)} aria-label={ariaLabel} style={{ ...softField, paddingRight: 40, cursor: 'pointer' }}>{children}</select>
      <span aria-hidden style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%) rotate(90deg)', color: 'var(--text-mid)', pointerEvents: 'none', display: 'flex' }}>
        <Ico d={ICON.chev} size={18} />
      </span>
    </div>
  )
}

// ── Pilules (choix) ─────────────────────────────────────────────
/** Pilules de choix : active = pilule sombre. `onCard` = posées sur une carte blanche. */
export function MPills<T extends string>({ options, value, onChange, scroll, onCard = true, guide }: {
  options: { v: T; l: ReactNode; dot?: string; count?: ReactNode }[]; value: T | null; onChange: (v: T) => void
  scroll?: boolean; onCard?: boolean; guide?: string
}) {
  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: scroll ? 'nowrap' : 'wrap', overflowX: scroll ? 'auto' : undefined, scrollbarWidth: 'none',
      ...(scroll ? { margin: '0 -16px', padding: '0 16px' } : null) }}>
      {options.map(o => {
        const on = o.v === value
        return (
          <button key={o.v} type="button" onClick={() => onChange(o.v)} aria-pressed={on} data-guide={guide}
            style={{ flexShrink: 0, minHeight: 44, padding: '0 16px', borderRadius: 'var(--r-pill)', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap',
              display: 'inline-flex', alignItems: 'center', gap: 7, fontFamily: FB, fontSize: 15, fontWeight: on ? 700 : 600,
              background: on ? 'var(--text)' : onCard ? CHIP : CARD, color: on ? 'var(--bg)' : 'var(--text)',
              boxShadow: !on && !onCard ? SOFT_SHADOW : 'none', transition: 'background 0.2s ease, color 0.2s ease' }}>
            {o.dot && <span aria-hidden style={{ width: 8, height: 8, borderRadius: '50%', background: o.dot, flexShrink: 0 }} />}
            {o.l}
            {o.count != null && <span style={{ ...NUM, fontSize: 13, fontWeight: 600, opacity: 0.6 }}>{o.count}</span>}
          </button>
        )
      })}
    </div>
  )
}

// ── Jauge : piste + remplissage + pouce blanc ───────────────────
export function MSlider({ value, onChange, min = 0, max = 10, step = 1, color = 'var(--primary)', label }: {
  value: number; onChange: (v: number) => void; min?: number; max?: number; step?: number; color?: string; label: string
}) {
  const ref = useRef<HTMLDivElement | null>(null)
  const pct = Math.max(0, Math.min(1, (value - min) / (max - min || 1)))
  const set = (v: number) => onChange(Math.max(min, Math.min(max, Math.round(v / step) * step)))
  const apply = (clientX: number) => {
    const r = ref.current?.getBoundingClientRect()
    if (!r || r.width <= 0) return
    set(min + ((clientX - r.left) / r.width) * (max - min))
  }
  return (
    <div role="slider" tabIndex={0} aria-label={label} aria-valuemin={min} aria-valuemax={max} aria-valuenow={value}
      onPointerDown={e => { e.currentTarget.setPointerCapture?.(e.pointerId); apply(e.clientX) }}
      onPointerMove={e => { if (e.buttons) apply(e.clientX) }}
      // Le geste de la jauge ne doit pas déclencher le « glisser pour fermer » de la feuille.
      onTouchStart={e => e.stopPropagation()} onTouchEnd={e => e.stopPropagation()}
      onKeyDown={e => {
        if (e.key === 'ArrowRight' || e.key === 'ArrowUp') { e.preventDefault(); set(value + step) }
        if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') { e.preventDefault(); set(value - step) }
      }}
      style={{ height: 44, display: 'flex', alignItems: 'center', cursor: 'pointer', touchAction: 'none', padding: '0 13px', outline: 'none' }}>
      <div ref={ref} style={{ position: 'relative', flex: 1, height: 6, borderRadius: 'var(--r-pill)', background: CHIP }}>
        <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${pct * 100}%`, borderRadius: 'var(--r-pill)', background: color, pointerEvents: 'none' }} />
        <span style={{ position: 'absolute', top: '50%', left: `${pct * 100}%`, width: 26, height: 26, borderRadius: '50%', background: THUMB_BG, boxShadow: THUMB_SHADOW, transform: 'translate(-50%,-50%)', pointerEvents: 'none' }} />
      </div>
    </div>
  )
}

/** Libellé + valeur /10 + jauge. */
export function SliderRow({ label, value, onChange, color, max = 10, suffix = '/10' }: {
  label: string; value: number; onChange: (v: number) => void; color?: string; max?: number; suffix?: string
}) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
        <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>{label}</span>
        <span style={{ ...NUM, fontSize: 22, fontWeight: 800, color: 'var(--text)' }}>{value}<span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-mid)', marginLeft: 2 }}>{suffix}</span></span>
      </div>
      <MSlider label={label} value={value} onChange={onChange} color={color} max={max} />
    </div>
  )
}

/** Piste de niveau (lecture seule) : piste + remplissage + pouce blanc, animée. */
export function MLevelTrack({ pct, color = 'var(--primary)' }: { pct: number; color?: string }) {
  const [on, setOn] = useState(false)
  const [reduce, setReduce] = useState(false)
  useEffect(() => {
    setReduce(window.matchMedia('(prefers-reduced-motion: reduce)').matches)
    const id = requestAnimationFrame(() => setOn(true)); return () => cancelAnimationFrame(id)
  }, [])
  const p = on || reduce ? Math.max(0, Math.min(100, pct)) : 0
  const tr = reduce ? 'none' : '0.9s cubic-bezier(0.25,1,0.5,1)'
  return (
    <div style={{ padding: '0 11px' }}>
      <div style={{ position: 'relative', height: 6, borderRadius: 'var(--r-pill)', background: CHIP }}>
        <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${p}%`, borderRadius: 'var(--r-pill)', background: color, transition: reduce ? 'none' : `width ${tr}` }} />
        <span style={{ position: 'absolute', top: '50%', left: `${p}%`, width: 22, height: 22, borderRadius: '50%', background: THUMB_BG, boxShadow: THUMB_SHADOW, transform: 'translate(-50%,-50%)', transition: reduce ? 'none' : `left ${tr}` }} />
      </div>
    </div>
  )
}

/** Coche ronde (rééducation, choix). */
export function RoundCheck({ on }: { on: boolean }) {
  return (
    <span aria-hidden style={{ width: 26, height: 26, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: on ? 'var(--primary)' : 'transparent', color: 'var(--on-primary)', boxShadow: on ? 'none' : 'inset 0 0 0 2px var(--border-mid)', transition: 'background 0.2s ease' }}>
      {on && <Ico d={<path d="M20 6 9 17l-5-5" />} size={16} sw={3} />}
    </span>
  )
}

/** Pilule secondaire (fond gris), pleine largeur par défaut. */
export function SoftPill({ children, onClick, disabled, full = true, color = 'var(--text)', style }: {
  children: ReactNode; onClick: () => void; disabled?: boolean; full?: boolean; color?: string; style?: CSSProperties
}) {
  return (
    <button type="button" onClick={onClick} disabled={disabled}
      style={{ width: full ? '100%' : undefined, minHeight: 48, padding: '0 18px', borderRadius: 'var(--r-pill)', border: 'none', background: CHIP, color,
        cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.55 : 1, fontSize: 16, fontWeight: 700, fontFamily: FB,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, flexShrink: 0, ...style }}>
      {children}
    </button>
  )
}

/** Bouton texte (« Modifier », « Historique », « Annuler »), cible 44 px. */
export function MTextBtn({ children, onClick, color = 'var(--primary)', disabled, label }: {
  children: ReactNode; onClick: () => void; color?: string; disabled?: boolean; label?: string
}) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} aria-label={label}
      style={{ flexShrink: 0, minHeight: 44, minWidth: 44, padding: '0 4px', border: 'none', background: 'transparent', cursor: disabled ? 'default' : 'pointer',
        color, opacity: disabled ? 0.55 : 1, fontSize: 15, fontWeight: 700, fontFamily: FB, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
      {children}
    </button>
  )
}

/** Puce « tag » (sévérité, niveau, tendance) : point + texte teinté sur fond faible opacité. */
export function MTag({ color, children }: { color: string; children: ReactNode }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 'var(--r-pill)', fontSize: 13, fontWeight: 700, color,
      background: `color-mix(in srgb, ${color} 14%, transparent)`, whiteSpace: 'nowrap', fontFamily: FB }}>
      <span aria-hidden style={{ width: 7, height: 7, borderRadius: '50%', background: color }} />{children}
    </span>
  )
}

/** Bloc de chargement (squelette — jamais de spinner). */
export function MSkeleton({ height = 96 }: { height?: number }) {
  return <div aria-hidden className="mui-skel" style={{ height, borderRadius: 'var(--r-lg)', background: CHIP }} />
}
export const SKELETON_CSS = '@keyframes muiPulse{0%,100%{opacity:.55}50%{opacity:1}}.mui-skel{animation:muiPulse 1.4s ease-in-out infinite}@media (prefers-reduced-motion: reduce){.mui-skel{animation:none}}'

// ── Feuille du bas (bottom sheet) ───────────────────────────────
type Slot = ReactNode | ((close: () => void) => ReactNode)
const renderSlot = (s: Slot, close: () => void) => (typeof s === 'function' ? s(close) : s)

/** Feuille mobile : voile, poignée, en-tête (titre centré + rond ×), contenu
 *  gris chaud défilant (cartes blanches), pied collant (pilule). Glisser vers
 *  le bas (contenu en haut) ou toucher le voile ferme avec animation. */
export function MSheetFrame({ title, subtitle, onClose, children, footer, zIndex = 3000, closeLabel, lead }: {
  title: ReactNode; subtitle?: ReactNode; onClose: () => void; children: Slot; footer?: Slot
  zIndex?: number; closeLabel: string; lead?: ReactNode
}) {
  const [mounted, setMounted] = useState(false)
  const [closing, setClosing] = useState(false)
  const startY = useRef<number | null>(null)
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const atTop = useRef(true)
  useEffect(() => { setMounted(true) }, [])
  const requestClose = useCallback(() => { setClosing(true); setTimeout(onClose, 260) }, [onClose])
  if (!mounted) return null
  return createPortal(
    <div onClick={requestClose} style={{ position: 'fixed', inset: 0, zIndex }}>
      <style>{SKELETON_CSS}</style>
      <div aria-hidden style={{ position: 'fixed', inset: 0, background: 'var(--scrim)', animation: `${closing ? 'fadeOutOverlay' : 'fadeInOverlay'} 260ms ease both` }} />
      <div role="dialog" aria-modal="true" aria-label={typeof title === 'string' ? title : undefined} onClick={e => e.stopPropagation()}
        onTouchStart={e => { startY.current = e.touches[0].clientY; atTop.current = (scrollRef.current?.scrollTop ?? 0) <= 0 }}
        onTouchEnd={e => { if (startY.current != null && atTop.current && e.changedTouches[0].clientY - startY.current > 70) requestClose(); startY.current = null }}
        style={{ position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 1, maxHeight: 'calc(100dvh - max(48px, env(safe-area-inset-top)) - 8px)',
          display: 'flex', flexDirection: 'column', background: PAGE, borderRadius: 'var(--r-lg) var(--r-lg) 0 0', boxShadow: 'var(--shadow-float)',
          fontFamily: FB, overflow: 'hidden', animation: `${closing ? 'sheet-close' : 'sheet-open'} 300ms cubic-bezier(0.16,1,0.3,1) both` }}>
        <div aria-hidden style={{ display: 'flex', justifyContent: 'center', paddingTop: 8, flexShrink: 0 }}>
          <span style={{ width: 38, height: 5, borderRadius: 'var(--r-pill)', background: 'var(--surface-bar)' }} />
        </div>
        <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 10, padding: '6px 16px 10px' }}>
          <div style={{ width: 44, flexShrink: 0, display: 'flex' }}>{lead}</div>
          <div style={{ flex: 1, minWidth: 0, textAlign: 'center' }}>
            <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', letterSpacing: '-0.01em' }}>{title}</h2>
            {subtitle && <p style={{ margin: '1px 0 0', fontSize: 13, color: 'var(--text-mid)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{subtitle}</p>}
          </div>
          <RoundBtn label={closeLabel} onClick={requestClose}><Ico d={ICON.close} size={20} sw={2.2} /></RoundBtn>
        </div>
        <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', overscrollBehavior: 'contain', WebkitOverflowScrolling: 'touch', padding: '4px 16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {renderSlot(children, requestClose)}
        </div>
        {footer
          ? <div style={{ flexShrink: 0, padding: '10px 16px calc(12px + env(safe-area-inset-bottom))', background: PAGE }}>{renderSlot(footer, requestClose)}</div>
          : <div aria-hidden style={{ flexShrink: 0, height: 'env(safe-area-inset-bottom)' }} />}
      </div>
    </div>,
    document.body,
  )
}
