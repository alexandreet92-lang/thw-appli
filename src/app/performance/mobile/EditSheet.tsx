'use client'
// ══════════════════════════════════════════════════════════════
// Performance mobile — coquille UNIQUE des feuilles de saisie / édition
// (records, courses Hyrox / Triathlon / vélo, ascensions, muscu, classements).
// Grammaire « Strava / Claude » : feuille gris chaud (--surface-page) qui
// glisse du bas avec poignée, en-tête (✕ ou « Annuler » · titre centré gras ·
// action texte à droite), cartes blanches groupées sans bordure, champs
// pleins doux (--surface-chip, radius 14, ≥ 48 px), segmentés gris à pouce
// blanc, pastilles (actif = pilule sombre), bouton principal cyan pleine
// largeur, actions destructives en texte rouge. Inter seule, tokens
// uniquement (clair / sombre gérés par globals.css). Cibles ≥ 44 px.
// Rendu MOBILE uniquement : les appelants gardent leur rendu desktop.
// ══════════════════════════════════════════════════════════════

import { useCallback, useEffect, useRef, useState, type CSSProperties, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from 'react'
import { createPortal } from 'react-dom'
import { useI18n } from '@/lib/i18n'
import { useIsMobile, roundBtnStyle, Ico, ICON } from '@/components/ai/mobile/MobileKit'

export { useIsMobile }

const FB = 'var(--font-body)'
export const S_PAGE = 'var(--surface-page)'
export const S_CARD = 'var(--surface-card)'
export const S_FIELD = 'var(--surface-chip)'
export const S_LINE = 'var(--border)'
export const S_NUM: CSSProperties = { fontVariantNumeric: 'tabular-nums', fontFeatureSettings: "'zero' 0" }
const SEG_SHADOW = '0 1px 3px rgba(0,0,0,0.10)' // design-allow-color — ombre du segment actif (maquette validée)
const SHEET_MAX_H = 'calc(100dvh - max(48px, env(safe-area-inset-top)) - 8px)'

const SHEET_CSS = `
@keyframes pe1FadeIn{from{opacity:0}to{opacity:1}}
@keyframes pe1FadeOut{from{opacity:1}to{opacity:0}}
.pe1-sheet input::placeholder,.pe1-sheet textarea::placeholder{color:var(--text-dim);font-weight:500}
.pe1-sheet input[type=number]::-webkit-inner-spin-button,.pe1-sheet input[type=number]::-webkit-outer-spin-button{-webkit-appearance:none;margin:0}
.pe1-sheet input[type=date]{-webkit-appearance:none;appearance:none;display:block}
.pe1-sheet input[type=date]::-webkit-date-and-time-value{text-align:left}
.pe1-noscroll{scrollbar-width:none}.pe1-noscroll::-webkit-scrollbar{display:none}
@media (prefers-reduced-motion: reduce){.pe1-sheet .sheet-open,.pe1-sheet .sheet-close,.pe1-scrim{animation-duration:1ms!important}}
`

/** Fermeture animée d'une feuille : `closing` pilote l'animation de sortie, `close()` démonte après. */
export function useSheetClose(onClose: () => void, ms = 240): [boolean, () => void] {
  const [closing, setClosing] = useState(false)
  const ref = useRef(onClose)
  useEffect(() => { ref.current = onClose })
  const done = useRef(false)
  const close = useCallback(() => {
    if (done.current) return
    done.current = true
    setClosing(true)
    setTimeout(() => ref.current(), ms)
  }, [ms])
  return [closing, close]
}

/** Point de couleur sport (sous-titre d'en-tête). */
export function SDot({ color, size = 8 }: { color: string; size?: number }) {
  return <span aria-hidden style={{ width: size, height: size, borderRadius: '50%', background: color, flexShrink: 0, display: 'inline-block' }} />
}

// ── Coquille ──────────────────────────────────────────────────────
export function PSheet({ onClose, closing, title, subtitle, cancelLabel, right, footer, children, zIndex = 3000, ariaLabel, full }: {
  onClose: () => void
  closing?: boolean
  title: ReactNode
  subtitle?: ReactNode
  /** Libellé texte à gauche (« Annuler ») ; par défaut un rond ✕. */
  cancelLabel?: string
  /** Action texte à droite (« Enregistrer », « OK »). */
  right?: { label: string; onClick: () => void; disabled?: boolean }
  /** Pied collant (bouton principal pleine largeur, action destructive…). */
  footer?: ReactNode
  children: ReactNode
  zIndex?: number
  ariaLabel?: string
  /** Hauteur maximale d'emblée (listes longues). */
  full?: boolean
}) {
  const { t } = useI18n()
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])
  if (!mounted) return null
  const sideBtn: CSSProperties = { border: 'none', background: 'transparent', cursor: 'pointer', minHeight: 44, padding: '0 4px', fontSize: 17, fontFamily: FB, whiteSpace: 'nowrap' }
  return createPortal(
    <div className="rec-drawer pe1-sheet" style={{ position: 'fixed', inset: 0, zIndex, fontFamily: FB }}>
      <style>{SHEET_CSS}</style>
      <div onClick={onClose} aria-hidden className="pe1-scrim"
        style={{ position: 'absolute', inset: 0, background: 'var(--scrim)', animation: `${closing ? 'pe1FadeOut' : 'pe1FadeIn'} 0.26s ease forwards` }} />
      <div role="dialog" aria-modal="true" aria-label={ariaLabel ?? (typeof title === 'string' ? title : undefined)}
        className={closing ? 'sheet-close' : 'sheet-open'}
        style={{ position: 'absolute', left: 0, right: 0, bottom: 0, background: S_PAGE, borderRadius: 'var(--r-lg) var(--r-lg) 0 0',
          height: full ? SHEET_MAX_H : undefined, maxHeight: SHEET_MAX_H, display: 'flex', flexDirection: 'column', overflow: 'hidden',
          boxShadow: 'var(--shadow-float)', willChange: 'transform' }}>
        {/* Poignée */}
        <div aria-hidden style={{ display: 'flex', justifyContent: 'center', paddingTop: 8, flexShrink: 0 }}>
          <span style={{ width: 38, height: 5, borderRadius: 'var(--r-pill)', background: 'var(--surface-bar)' }} />
        </div>
        {/* En-tête : ✕ / Annuler · titre centré · action */}
        <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px 12px' }}>
          <div style={{ width: 88, display: 'flex', flexShrink: 0 }}>
            {cancelLabel
              ? <button type="button" onClick={onClose} style={{ ...sideBtn, color: 'var(--text-mid)', fontWeight: 600 }}>{cancelLabel}</button>
              : <button type="button" onClick={onClose} aria-label={t('pe1.close')} title={t('pe1.close')} style={roundBtnStyle}><Ico d={ICON.close} size={20} sw={2.2} /></button>}
          </div>
          <div style={{ flex: 1, minWidth: 0, textAlign: 'center' }}>
            <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.01em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</div>
            {subtitle && (
              <div style={{ marginTop: 2, fontSize: 13, fontWeight: 600, color: 'var(--text-mid)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, overflow: 'hidden', whiteSpace: 'nowrap' }}>{subtitle}</div>
            )}
          </div>
          <div style={{ width: 88, display: 'flex', justifyContent: 'flex-end', flexShrink: 0 }}>
            {right && (
              <button type="button" onClick={right.onClick} disabled={right.disabled}
                style={{ ...sideBtn, color: 'var(--primary)', fontWeight: 800, opacity: right.disabled ? 0.45 : 1, cursor: right.disabled ? 'default' : 'pointer' }}>{right.label}</button>
            )}
          </div>
        </div>
        {/* Corps défilable */}
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', overscrollBehavior: 'contain', WebkitOverflowScrolling: 'touch',
          padding: footer ? '2px 16px 16px' : '2px 16px calc(20px + env(safe-area-inset-bottom))', display: 'flex', flexDirection: 'column', gap: 20 }}>
          {children}
        </div>
        {footer && (
          <div style={{ flexShrink: 0, padding: '10px 16px calc(12px + env(safe-area-inset-bottom))', background: S_PAGE, display: 'flex', flexDirection: 'column', gap: 2 }}>
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  )
}

// ── Sections / cartes ─────────────────────────────────────────────
/** Section : libellé gris (casse normale) au-dessus, aide grise en dessous. */
export function SSection({ label, right, helper, children }: { label?: ReactNode; right?: ReactNode; helper?: ReactNode; children: ReactNode }) {
  return (
    <section style={{ minWidth: 0 }}>
      {(label || right) && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, margin: '0 4px 8px', minHeight: 20 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-mid)' }}>{label}</span>
          {right}
        </div>
      )}
      {children}
      {helper && <p style={{ margin: '8px 4px 0', fontSize: 13, color: 'var(--text-mid)', lineHeight: 1.4 }}>{helper}</p>}
    </section>
  )
}

/** Carte blanche radius 20, sans bordure. */
export function SCard({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return <div style={{ background: S_CARD, borderRadius: 'var(--r-lg)', padding: 16, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 14, ...style }}>{children}</div>
}

/** Liste groupée (carte blanche, lignes séparées par un filet encarté). */
export function SGroup({ children }: { children: ReactNode }) {
  return <div style={{ background: S_CARD, borderRadius: 'var(--r-lg)', overflow: 'hidden', minWidth: 0 }}>{children}</div>
}

/** Ligne de liste groupée. */
export function SRow({ first, label, sub, value, right, onClick, danger, chevron, disabled, lead }: {
  first?: boolean; label: ReactNode; sub?: ReactNode; value?: ReactNode; right?: ReactNode
  onClick?: () => void; danger?: boolean; chevron?: boolean; disabled?: boolean; lead?: ReactNode
}) {
  const inner = (
    <>
      {!first && <span aria-hidden style={{ position: 'absolute', top: 0, left: 16, right: 16, height: 1, background: S_LINE }} />}
      {lead}
      <span style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
        <span style={{ display: 'block', fontSize: 16, fontWeight: 600, color: danger ? 'var(--danger)' : 'var(--text)', lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
        {sub != null && sub !== '' && <span style={{ ...S_NUM, display: 'block', fontSize: 13, color: 'var(--text-mid)', marginTop: 2, lineHeight: 1.35, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sub}</span>}
      </span>
      {value != null && value !== '' && <span style={{ ...S_NUM, fontSize: 16, fontWeight: 700, color: 'var(--text)', whiteSpace: 'nowrap', flexShrink: 0 }}>{value}</span>}
      {right}
      {chevron && <span aria-hidden style={{ display: 'flex', color: 'var(--text-dim)', flexShrink: 0 }}><Ico d={ICON.chev} size={18} /></span>}
    </>
  )
  const st: CSSProperties = { position: 'relative', display: 'flex', alignItems: 'center', gap: 12, width: '100%', minHeight: 56, padding: '10px 16px', boxSizing: 'border-box', fontFamily: FB, color: 'var(--text)' }
  if (!onClick) return <div style={st}>{inner}</div>
  return (
    <button type="button" onClick={disabled ? undefined : onClick} disabled={disabled} data-no-fx
      style={{ ...st, border: 'none', background: 'transparent', cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.55 : 1 }}>
      {inner}
    </button>
  )
}

/** Grille de champs (2 ou 3 colonnes). */
export function SGrid({ cols = 2, children }: { cols?: number; children: ReactNode }) {
  return <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, gap: 12 }}>{children}</div>
}

// ── Champs ────────────────────────────────────────────────────────
export const sInput: CSSProperties = {
  width: '100%', minHeight: 48, padding: '0 14px', borderRadius: 'var(--r-md)', border: 'none', background: S_FIELD,
  color: 'var(--text)', fontFamily: FB, fontSize: 17, fontWeight: 600, outline: 'none', boxSizing: 'border-box', ...S_NUM,
}

function FieldLabel({ children }: { children: ReactNode }) {
  return <span style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-mid)', margin: '0 2px 6px', lineHeight: 1.3 }}>{children}</span>
}

/** Champ plein doux : libellé gris au-dessus, unité intégrée à droite, aide / calcul dessous. */
export function SField({ label, unit, hint, style, ...rest }: { label?: ReactNode; unit?: string; hint?: ReactNode } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label style={{ display: 'block', minWidth: 0 }}>
      {label && <FieldLabel>{label}</FieldLabel>}
      <span style={{ position: 'relative', display: 'block' }}>
        <input {...rest} style={{ ...sInput, padding: unit ? `0 ${Math.max(36, 20 + unit.length * 10)}px 0 14px` : '0 14px', ...style }} />
        {unit && <span aria-hidden style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 15, fontWeight: 600, color: 'var(--text-dim)', pointerEvents: 'none' }}>{unit}</span>}
      </span>
      {hint && <span style={{ ...S_NUM, display: 'block', margin: '6px 2px 0', fontSize: 13, color: 'var(--text-mid)', lineHeight: 1.35 }}>{hint}</span>}
    </label>
  )
}

export function STextArea({ label, style, ...rest }: { label?: ReactNode } & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <label style={{ display: 'block', minWidth: 0 }}>
      {label && <FieldLabel>{label}</FieldLabel>}
      <textarea {...rest} style={{ ...sInput, minHeight: 88, padding: '12px 14px', fontWeight: 500, resize: 'vertical', lineHeight: 1.4, ...style }} />
    </label>
  )
}

/** Libellé de groupe de contrôles (segmenté, pastilles…). */
export function SLabel({ children }: { children: ReactNode }) { return <FieldLabel>{children}</FieldLabel> }

// ── Sélecteurs ────────────────────────────────────────────────────
/** Segmenté : piste grise, pouce blanc. */
export function SSeg<T extends string>({ options, value, onChange, ariaLabel }: {
  options: { id: T; label: ReactNode }[]; value: T; onChange: (v: T) => void; ariaLabel?: string
}) {
  return (
    <div role="tablist" aria-label={ariaLabel} className="pe1-noscroll"
      style={{ display: 'flex', gap: 2, padding: 3, borderRadius: 'var(--r-pill)', background: S_FIELD, overflowX: 'auto', minWidth: 0 }}>
      {options.map(o => {
        const on = o.id === value
        return (
          <button key={o.id} type="button" role="tab" aria-selected={on} onClick={() => onChange(o.id)} data-no-fx
            style={{ flex: '1 0 auto', minHeight: 40, padding: '0 14px', borderRadius: 'var(--r-pill)', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap',
              background: on ? 'var(--float-bg)' : 'transparent', color: on ? 'var(--text)' : 'var(--text-mid)', boxShadow: on ? SEG_SHADOW : 'none',
              fontSize: 15, fontWeight: on ? 700 : 600, fontFamily: FB, transition: 'background 0.18s ease, color 0.18s ease' }}>
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

/** Pastilles (actif = pilule sombre). `wrap=false` → rangée défilante. */
export function SChips<T extends string>({ options, isOn, onPick, wrap = true, ariaLabel }: {
  options: { id: T; label: ReactNode }[]; isOn: (id: T) => boolean; onPick: (id: T) => void; wrap?: boolean; ariaLabel?: string
}) {
  return (
    <div role="group" aria-label={ariaLabel} className="pe1-noscroll"
      style={{ display: 'flex', flexWrap: wrap ? 'wrap' : 'nowrap', gap: 8, overflowX: wrap ? 'visible' : 'auto', minWidth: 0 }}>
      {options.map(o => {
        const on = isOn(o.id)
        return (
          <button key={o.id} type="button" aria-pressed={on} onClick={() => onPick(o.id)} data-no-fx
            style={{ flexShrink: 0, minHeight: 44, padding: '0 16px', borderRadius: 'var(--r-pill)', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap',
              background: on ? 'var(--text)' : S_FIELD, color: on ? 'var(--bg)' : 'var(--text-mid)', fontSize: 15, fontWeight: 700, fontFamily: FB,
              display: 'inline-flex', alignItems: 'center', gap: 6, transition: 'background 0.18s ease, color 0.18s ease' }}>
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

/** Échelle 1–5 (chiffre + libellé), actif = pilule sombre. */
export function SScale({ options, value, onChange }: { options: { v: number; label: string }[]; value: number | null; onChange: (v: number) => void }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))`, gap: 6 }}>
      {options.map(o => {
        const on = o.v === value
        return (
          <button key={o.v} type="button" aria-pressed={on} onClick={() => onChange(o.v)} data-no-fx
            style={{ minHeight: 58, padding: '6px 2px', borderRadius: 'var(--r-md)', border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2,
              background: on ? 'var(--text)' : S_FIELD, color: on ? 'var(--bg)' : 'var(--text-mid)', fontFamily: FB, minWidth: 0 }}>
            <span style={{ ...S_NUM, fontSize: 17, fontWeight: 800 }}>{o.v}</span>
            <span style={{ fontSize: 11, fontWeight: 600, lineHeight: 1.15, textAlign: 'center', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis' }}>{o.label}</span>
          </button>
        )
      })}
    </div>
  )
}

/** Interrupteur iOS (piste + pouce blanc). */
export function SSwitch({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} onClick={() => onChange(!on)} data-no-fx
      style={{ width: 51, height: 31, minWidth: 51, borderRadius: 'var(--r-pill)', border: 'none', padding: 2, cursor: 'pointer', position: 'relative', flexShrink: 0,
        background: on ? 'var(--primary)' : 'var(--surface-bar)', transition: 'background 0.2s ease' }}>
      <span aria-hidden style={{ position: 'absolute', top: 2, left: on ? 22 : 2, width: 27, height: 27, borderRadius: '50%', background: 'var(--float-bg)', boxShadow: SEG_SHADOW, transition: 'left 0.2s ease' }} />
    </button>
  )
}

// ── Valeurs calculées / résumé ───────────────────────────────────
/** Pastilles de valeurs calculées (allure, W/kg…). */
export function SCalc({ items }: { items: (string | null | undefined | false)[] }) {
  const xs = items.filter((x): x is string => !!x)
  if (!xs.length) return null
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
      {xs.map(x => (
        <span key={x} style={{ ...S_NUM, display: 'inline-flex', alignItems: 'center', minHeight: 30, padding: '0 12px', borderRadius: 'var(--r-pill)', background: S_FIELD, fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{x}</span>
      ))}
    </div>
  )
}

/** Résumé en grille (libellé gris · gros chiffre). */
export function SStats({ items, cols = 2 }: { items: { label: ReactNode; value: ReactNode; sub?: ReactNode }[]; cols?: number }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, gap: '14px 12px' }}>
      {items.map((it, i) => (
        <div key={i} style={{ minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--text-mid)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{it.label}</p>
          <p style={{ ...S_NUM, margin: '2px 0 0', fontSize: 19, fontWeight: 800, letterSpacing: '-0.01em', color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{it.value}</p>
          {it.sub && <p style={{ margin: '1px 0 0', fontSize: 13, color: 'var(--text-mid)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{it.sub}</p>}
        </div>
      ))}
    </div>
  )
}

// ── Actions ───────────────────────────────────────────────────────
/** Bouton principal cyan pleine largeur (pilule, ≥ 52 px). */
export function SPrimary({ children, onClick, disabled }: { children: ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled}
      style={{ width: '100%', minHeight: 52, borderRadius: 'var(--r-pill)', border: 'none', cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.45 : 1,
        background: 'var(--primary)', color: 'var(--on-primary)', fontSize: 17, fontWeight: 700, fontFamily: FB, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
      {children}
    </button>
  )
}

/** Bouton secondaire (pilule blanche sur page grise, ou grise sur carte). */
export function SSecondary({ children, onClick, disabled, onCard }: { children: ReactNode; onClick: () => void; disabled?: boolean; onCard?: boolean }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled}
      style={{ flex: 1, width: '100%', minHeight: 48, padding: '0 16px', borderRadius: 'var(--r-pill)', border: 'none', cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.45 : 1,
        background: onCard ? S_FIELD : S_CARD, color: 'var(--text)', fontSize: 16, fontWeight: 700, fontFamily: FB, whiteSpace: 'nowrap' }}>
      {children}
    </button>
  )
}

/** Action destructive : texte rouge centré. */
export function SDanger({ children, onClick, disabled }: { children: ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled}
      style={{ width: '100%', minHeight: 48, border: 'none', background: 'transparent', cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.5 : 1,
        color: 'var(--danger)', fontSize: 16, fontWeight: 600, fontFamily: FB }}>
      {children}
    </button>
  )
}

/** Petit bouton texte (lien cyan) dans une carte / un en-tête de section. */
export function SLinkBtn({ children, onClick, color = 'var(--primary)', disabled }: { children: ReactNode; onClick: () => void; color?: string; disabled?: boolean }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled}
      style={{ minHeight: 44, padding: '0 4px', border: 'none', background: 'transparent', cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.5 : 1,
        color, fontSize: 15, fontWeight: 700, fontFamily: FB, whiteSpace: 'nowrap', flexShrink: 0, alignSelf: 'flex-start' }}>
      {children}
    </button>
  )
}

/** Message d'erreur (texte teinté, sans surface colorée). */
export function SError({ children }: { children: ReactNode }) {
  return <p role="alert" style={{ margin: 0, padding: '0 4px', fontSize: 14, fontWeight: 600, color: 'var(--danger)', lineHeight: 1.4 }}>{children}</p>
}

/** Texte vide / chargement dans une carte. */
export function SEmpty({ children }: { children: ReactNode }) {
  return <p style={{ margin: 0, padding: '18px 16px', fontSize: 15, color: 'var(--text-mid)', lineHeight: 1.45, textAlign: 'center' }}>{children}</p>
}

/** Squelette de ligne (jamais de spinner). */
export function SSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <SGroup>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="dash-skel" style={{ height: 56, borderTop: i ? `1px solid ${S_LINE}` : 'none', background: 'transparent' }} />
      ))}
    </SGroup>
  )
}

/** Accordéon (carte blanche, titre 16 gras + chevron). */
export function SAccordion({ title, children }: { title: ReactNode; children: ReactNode }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ background: S_CARD, borderRadius: 'var(--r-lg)', overflow: 'hidden' }}>
      <button type="button" onClick={() => setOpen(o => !o)} aria-expanded={open} data-no-fx
        style={{ width: '100%', minHeight: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '0 16px', border: 'none', background: 'transparent', cursor: 'pointer', fontFamily: FB, fontSize: 16, fontWeight: 700, color: 'var(--text)', textAlign: 'left' }}>
        {title}
        <span aria-hidden style={{ display: 'flex', color: 'var(--text-dim)', transform: open ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s ease' }}><Ico d={ICON.chev} size={18} /></span>
      </button>
      {open && <div style={{ padding: '0 16px 16px' }}>{children}</div>}
    </div>
  )
}
