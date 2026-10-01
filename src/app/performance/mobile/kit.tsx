'use client'
// ══════════════════════════════════════════════════════════════
// Performance mobile — briques d'interface des pages détail (sport, Évolution).
// Page grise, cartes blanches sans bordure (var(--dash-card)), une idée par
// carte, gros chiffres Inter tabulaires, légendes en --text-mid. Les couleurs
// passent toutes par des tokens (sport / année via var()).
// ══════════════════════════════════════════════════════════════

import { createContext, useContext, useEffect, useState } from 'react'
import { useReducedMotion } from '@/components/dashboard/primitives'

/** Vrai quand un composant est rendu dans une page détail mobile. */
export const PerfMobileContext = createContext(false)
export const usePerfMobile = () => useContext(PerfMobileContext)

export const NUM: React.CSSProperties = { fontVariantNumeric: 'tabular-nums', fontFeatureSettings: "'zero' 0" }
export const FB = 'var(--font-body)'
export const CARD_BG = 'var(--dash-card, var(--bg-card))'
export const CHIP_BG = 'var(--dash-chip, var(--bg-card2))'
export const SOFT_BG = 'var(--dash-soft, var(--bg-card2))'
export const LINE = 'var(--dash-line, var(--border))'
export const TRACK = 'var(--dash-chip, var(--bg-hover))'

/** Style de carte mobile (réutilisé par les cartes historiques en mode mobile). */
export const M_CARD: React.CSSProperties = {
  background: CARD_BG, borderRadius: 'var(--r-lg)', padding: '16px 18px 18px', border: 'none', boxShadow: 'none', minWidth: 0,
}

const SvgI = (d: string) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d={d} /></svg>
)
export const M_ICONS = {
  chart: SvgI('M3 3v18h18M7 16v-4M12 16V8M17 16v-7'),
  trend: SvgI('m3 17 6-6 4 4 8-8M14 7h7v7'),
  trophy: SvgI('M6 9H4.5a2.5 2.5 0 0 1 0-5H6M18 9h1.5a2.5 2.5 0 0 0 0-5H18M4 22h16M18 2H6v7a6 6 0 0 0 12 0V2z'),
  test: SvgI('M9 11l3 3 8-8M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11'),
  mountain: SvgI('m8 3 4 8 5-5 5 15H2L8 3z'),
}

export function Chevron({ color = 'var(--text-dim)' }: { color?: string }) {
  return <svg aria-hidden width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="m9 18 6-6-6-6" /></svg>
}

/** Carte blanche : en-tête (icône · titre · méta) + contenu. */
export function MCard({ icon, title, meta, children, style, id }: {
  icon?: React.ReactNode
  title?: React.ReactNode
  meta?: React.ReactNode
  children?: React.ReactNode
  style?: React.CSSProperties
  id?: string
}) {
  return (
    <section id={id} style={{ ...M_CARD, fontFamily: FB, ...style }}>
      {(title || meta) && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, minWidth: 0 }}>
          {icon && <span aria-hidden style={{ display: 'flex', color: 'var(--primary)', flexShrink: 0 }}>{icon}</span>}
          <h2 style={{ margin: 0, flex: 1, minWidth: 0, fontFamily: FB, fontSize: 17, fontWeight: 700, letterSpacing: '-0.01em', color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</h2>
          {meta != null && <span style={{ fontFamily: FB, fontSize: 14, color: 'var(--text-mid)', whiteSpace: 'nowrap', flexShrink: 0, display: 'flex', alignItems: 'center' }}>{meta}</span>}
        </div>
      )}
      {children}
    </section>
  )
}

/** Méta d'en-tête cliquable (« Chronologique ▾ », « HF »…). */
export function MetaButton({ children, onClick, ariaLabel }: { children: React.ReactNode; onClick: () => void; ariaLabel?: string }) {
  return (
    <button type="button" onClick={onClick} aria-label={ariaLabel}
      style={{ border: 'none', background: 'none', padding: '6px 0', minHeight: 32, cursor: 'pointer', fontFamily: FB, fontSize: 14, color: 'var(--text-mid)', whiteSpace: 'nowrap' }}>
      {children}
    </button>
  )
}

/** Sélecteur natif présenté comme une méta texte (« Heures ▾ »). */
export function MetaSelect<T extends string>({ value, options, onChange, ariaLabel }: {
  value: T; options: { id: T; label: string }[]; onChange: (v: T) => void; ariaLabel: string
}) {
  const cur = options.find(o => o.id === value)?.label ?? ''
  return (
    <label style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', gap: 4, fontFamily: FB, fontSize: 14, color: 'var(--text-mid)', whiteSpace: 'nowrap', cursor: 'pointer', minHeight: 32 }}>
      {cur} <span aria-hidden style={{ fontSize: 11 }}>▾</span>
      <select aria-label={ariaLabel} value={value} onChange={e => onChange(e.target.value as T)}
        style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', fontSize: 16 }}>
        {options.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
      </select>
    </label>
  )
}

/** Ligne de record : libellé + sous-texte à gauche, valeur (+ PR) et seconde ligne à droite. */
export function MRow({ label, sub, value, right2, pr, first, onClick, dim }: {
  label: React.ReactNode; sub?: React.ReactNode; value: React.ReactNode; right2?: React.ReactNode
  pr?: boolean; first?: boolean; onClick?: () => void; dim?: boolean
}) {
  const body = (
    <>
      <span style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
        <b style={{ display: 'block', fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>{label}</b>
        {sub && <span style={{ ...NUM, display: 'block', fontSize: 13, color: 'var(--text-mid)', marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{sub}</span>}
      </span>
      <span style={{ textAlign: 'right', flexShrink: 0 }}>
        <b style={{ ...NUM, display: 'block', fontSize: 15, fontWeight: 700, color: dim ? 'var(--text-dim)' : 'var(--text)', whiteSpace: 'nowrap' }}>
          {value}{pr && <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--charge-mid)', marginLeft: 5 }}>PR</span>}
        </b>
        {right2 && <span style={{ ...NUM, display: 'block', fontSize: 12, color: 'var(--text-mid)', marginTop: 1, whiteSpace: 'nowrap' }}>{right2}</span>}
      </span>
    </>
  )
  const style: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: first ? '0 0 12px' : '12px 0',
    borderTop: first ? 'none' : `1px solid ${LINE}`, fontFamily: FB, minHeight: 44,
  }
  if (!onClick) return <div style={style}>{body}</div>
  return (
    <button type="button" onClick={onClick} data-no-fx
      style={{ ...style, border: 'none', borderTop: style.borderTop, background: 'none', cursor: 'pointer', color: 'inherit' }}>
      {body}
    </button>
  )
}

/** Lien cyan en pied de carte (« Voir les 20 durées › »). */
export function MLink({ children, onClick, first }: { children: React.ReactNode; onClick: () => void; first?: boolean }) {
  return (
    <button type="button" onClick={onClick} data-no-fx
      style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: first ? '2px 0 0' : '12px 0 0', marginTop: first ? 0 : 0, border: 'none', borderTop: first ? 'none' : `1px solid ${LINE}`, background: 'none', cursor: 'pointer', fontFamily: FB, minHeight: 44, textAlign: 'left' }}>
      <span style={{ flex: 1, fontSize: 16, fontWeight: 700, color: 'var(--primary)' }}>{children}</span>
      <Chevron />
    </button>
  )
}

/** Bouton principal pleine largeur (cyan). */
export function MPrimary({ children, onClick, disabled }: { children: React.ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled}
      style={{ width: '100%', minHeight: 52, padding: '14px 18px', borderRadius: 'var(--r-pill)', border: 'none', background: 'var(--primary)', color: 'var(--on-primary)', fontFamily: FB, fontSize: 16, fontWeight: 700, cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1 }}>
      {children}
    </button>
  )
}

/** Bouton secondaire (pilule grise). */
export function MSecondary({ children, onClick, disabled, full }: { children: React.ReactNode; onClick: () => void; disabled?: boolean; full?: boolean }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled}
      style={{ flex: full ? undefined : 1, width: full ? '100%' : undefined, minHeight: 44, padding: full ? '14px 18px' : '10px 12px', borderRadius: 'var(--r-pill)', border: 'none', background: CHIP_BG, color: 'var(--text)', fontFamily: FB, fontSize: full ? 16 : 14, fontWeight: 700, cursor: disabled ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap', opacity: disabled ? 0.5 : 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>
      {children}
    </button>
  )
}

export function MButtons({ children }: { children: React.ReactNode }) {
  return <div style={{ display: 'flex', gap: 8 }}>{children}</div>
}

/** Pastilles horizontales (années, sports) : actif = pilule foncée. */
export function MChips<T extends string>({ options, value, onChange, ariaLabel }: {
  options: { id: T; label: string }[]; value: T; onChange: (v: T) => void; ariaLabel?: string
}) {
  return (
    <div role="tablist" aria-label={ariaLabel} style={{ display: 'flex', gap: 8, overflowX: 'auto', scrollbarWidth: 'none', flexShrink: 0 }}>
      {options.map(o => {
        const on = o.id === value
        return (
          <button key={o.id} type="button" role="tab" aria-selected={on} onClick={() => onChange(o.id)}
            style={{ padding: '8px 14px', minHeight: 36, borderRadius: 'var(--r-pill)', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: FB, fontSize: 14, fontWeight: 700, flexShrink: 0,
              background: on ? 'var(--text)' : CARD_BG, color: on ? 'var(--bg)' : 'var(--text-mid)' }}>{o.label}</button>
        )
      })}
    </div>
  )
}

/** Pastilles plus petites dans une carte (segments Hyrox…). */
export function MMiniChips<T extends string>({ options, value, onChange }: { options: { id: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div style={{ display: 'flex', gap: 8, overflowX: 'auto', scrollbarWidth: 'none', paddingBottom: 2 }}>
      {options.map(o => {
        const on = o.id === value
        return (
          <button key={o.id} type="button" onClick={() => onChange(o.id)}
            style={{ padding: '7px 12px', minHeight: 34, borderRadius: 'var(--r-pill)', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: FB, fontSize: 13, fontWeight: 700, flexShrink: 0,
              background: on ? 'var(--text)' : CHIP_BG, color: on ? 'var(--bg)' : 'var(--text-mid)' }}>{o.label}</button>
        )
      })}
    </div>
  )
}

/** Contrôle segmenté pleine largeur (piste grise, segment actif blanc). */
export function MSeg<T extends string>({ options, value, onChange, ariaLabel }: {
  options: { id: T; label: string }[]; value: T; onChange: (v: T) => void; ariaLabel?: string
}) {
  return (
    <div role="tablist" aria-label={ariaLabel} style={{ display: 'flex', padding: 3, borderRadius: 'var(--r-pill)', background: CHIP_BG, overflowX: 'auto', scrollbarWidth: 'none' }}>
      {options.map(o => {
        const on = o.id === value
        return (
          <button key={o.id} type="button" role="tab" aria-selected={on} onClick={() => onChange(o.id)} data-no-fx
            style={{ flex: '1 0 auto', minHeight: 38, padding: '8px 12px', borderRadius: 'var(--r-pill)', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: FB, fontSize: 14, fontWeight: 700,
              background: on ? CARD_BG : 'transparent', color: on ? 'var(--text)' : 'var(--text-mid)', boxShadow: on ? 'var(--shadow-card, none)' : 'none', transition: 'background 0.15s, color 0.15s' }}>
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

/** Légende d'année basculable (point coloré + année). */
export function MLegendChip({ color, label, off, onClick }: { color: string; label: string; off?: boolean; onClick?: () => void }) {
  return (
    <button type="button" onClick={onClick} disabled={!onClick} aria-pressed={onClick ? !off : undefined}
      style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 11px', minHeight: 32, borderRadius: 'var(--r-pill)', border: 'none',
        background: `color-mix(in srgb, ${color} 12%, transparent)`, cursor: onClick ? 'pointer' : 'default', opacity: off ? 0.4 : 1, fontFamily: FB, fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>
      <span aria-hidden style={{ width: 8, height: 8, borderRadius: '50%', background: color }} />{label}
    </button>
  )
}

export function MHint({ children }: { children: React.ReactNode }) {
  return <p style={{ margin: '10px 0 0', fontFamily: FB, fontSize: 13, color: 'var(--text-mid)', lineHeight: 1.4 }}>{children}</p>
}

export function MEmpty({ children }: { children: React.ReactNode }) {
  return <p style={{ margin: 0, fontFamily: FB, fontSize: 15, color: 'var(--text-mid)', lineHeight: 1.45 }}>{children}</p>
}

/** Chip de niveau à côté du titre (« AHN · 7,4 ») — texte teinté, fond très léger. */
export function MLevelChip({ label, color }: { label: string; color: string }) {
  return (
    <span style={{ ...NUM, display: 'inline-flex', alignItems: 'center', padding: '4px 10px', borderRadius: 'var(--r-pill)', background: `color-mix(in srgb, ${color} 14%, transparent)`, color: 'var(--text)', fontFamily: FB, fontSize: 14, fontWeight: 700, whiteSpace: 'nowrap' }}>
      <span aria-hidden style={{ width: 7, height: 7, borderRadius: '50%', background: color, marginRight: 6 }} />{label}
    </span>
  )
}

/** Animation 0 → valeur au montage et à chaque changement (prefers-reduced-motion respecté). */
function useGrow(key: string): boolean {
  const reduce = useReducedMotion()
  const [on, setOn] = useState(reduce)
  useEffect(() => {
    if (reduce) { setOn(true); return }
    setOn(false)
    const id = requestAnimationFrame(() => requestAnimationFrame(() => setOn(true)))
    return () => cancelAnimationFrame(id)
  }, [key, reduce])
  return on
}

export interface MBar { key: string; top: string; bottom: string; pct: number; color: string; best?: boolean; onClick?: () => void; ariaLabel?: string }

/** Jauges verticales (une par course / distance) : valeur en haut, légende en bas, meilleure entourée. */
export function MBars({ bars, height = 110, minWidth = 46 }: { bars: MBar[]; height?: number; minWidth?: number }) {
  const grow = useGrow(bars.map(b => `${b.key}:${b.pct.toFixed(1)}`).join('|'))
  return (
    <div className="rec-gauge-strip" style={{ display: 'flex', gap: 6, overflowX: 'auto', scrollbarWidth: 'none', padding: '4px 2px' }}>
      {bars.map(b => {
        const inner = (
          <>
            <span style={{ ...NUM, fontFamily: FB, fontSize: 12, fontWeight: 800, color: 'var(--text)', whiteSpace: 'nowrap' }}>{b.top}</span>
            <span style={{ display: 'flex', alignItems: 'flex-end', width: 22, height, borderRadius: 'var(--r-sm)', background: TRACK, overflow: 'hidden',
              outline: b.best ? '2px solid var(--charge-mid)' : 'none', outlineOffset: 2 }}>
              <span style={{ display: 'block', width: '100%', height: grow ? `${Math.max(4, Math.min(100, b.pct))}%` : '0%', borderRadius: 'var(--r-sm)', background: b.color, transition: 'height 0.9s cubic-bezier(0.32,0.72,0,1)' }} />
            </span>
            <span style={{ ...NUM, fontFamily: FB, fontSize: 12, color: 'var(--text-mid)', whiteSpace: 'nowrap' }}>{b.bottom}</span>
          </>
        )
        const st: React.CSSProperties = { flex: `1 0 ${minWidth}px`, minWidth, minHeight: 44, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: 0, border: 'none', background: 'none', color: 'inherit' }
        return b.onClick
          ? <button key={b.key} type="button" onClick={b.onClick} aria-label={b.ariaLabel} data-no-fx style={{ ...st, cursor: 'pointer' }}>{inner}</button>
          : <div key={b.key} style={st}>{inner}</div>
      })}
    </div>
  )
}

/** Barres par année (valeur au-dessus, année dessous) — l'année surlignée en cyan. */
export function MYearBars({ items, highlight, height = 84, fmt, onPick }: {
  items: { label: string; value: number }[]; highlight?: string; height?: number
  fmt: (v: number) => string; onPick?: (label: string) => void
}) {
  const grow = useGrow(items.map(i => `${i.label}:${i.value}`).join('|'))
  const max = Math.max(1, ...items.map(i => i.value))
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, overflowX: 'auto', scrollbarWidth: 'none' }}>
      {items.map(it => {
        const on = it.label === highlight
        const h = it.value > 0 ? Math.max(6, (it.value / max) * height) : 4
        const inner = (
          <>
            <span style={{ ...NUM, fontFamily: FB, fontSize: 13, fontWeight: 800, color: it.value > 0 ? 'var(--text)' : 'var(--text-dim)', whiteSpace: 'nowrap' }}>{it.value > 0 ? fmt(it.value) : '—'}</span>
            <span style={{ display: 'flex', alignItems: 'flex-end', height, width: '100%', justifyContent: 'center' }}>
              <span style={{ display: 'block', width: '100%', maxWidth: 36, height: grow ? h : 0, borderRadius: 'var(--r-sm)', background: on ? 'var(--primary)' : 'var(--dash-bar, var(--border-mid))', transition: 'height 0.9s cubic-bezier(0.32,0.72,0,1)' }} />
            </span>
            <span style={{ ...NUM, fontFamily: FB, fontSize: 13, color: on ? 'var(--text)' : 'var(--text-mid)', fontWeight: on ? 700 : 500 }}>{it.label}</span>
          </>
        )
        const st: React.CSSProperties = { flex: '1 0 44px', minWidth: 44, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: 0, border: 'none', background: 'none', color: 'inherit' }
        return onPick
          ? <button key={it.label} type="button" onClick={() => onPick(it.label)} data-no-fx style={{ ...st, cursor: 'pointer' }}>{inner}</button>
          : <div key={it.label} style={st}>{inner}</div>
      })}
    </div>
  )
}

/** Jauge horizontale animée (records muscu…). */
export function MHBar({ pct, color }: { pct: number; color: string }) {
  const grow = useGrow(pct.toFixed(1))
  return (
    <div style={{ height: 10, borderRadius: 'var(--r-pill)', background: TRACK, overflow: 'hidden' }}>
      <div style={{ height: '100%', width: grow ? `${Math.max(0, Math.min(100, pct))}%` : '0%', borderRadius: 'var(--r-pill)', background: color, transition: 'width 0.9s cubic-bezier(0.32,0.72,0,1)' }} />
    </div>
  )
}

/** Date courte localisée (« 12 août »). */
export function shortDay(iso: string, locale: string): string {
  const d = new Date(iso.length === 10 ? `${iso}T12:00:00` : iso)
  if (isNaN(d.getTime())) return ''
  return d.toLocaleDateString(locale, { day: 'numeric', month: 'short' })
}
/** Mois court + année 2 chiffres (« mai 26 »). */
export function monthYear(iso: string, locale: string): string {
  const d = new Date(iso.length === 10 ? `${iso}T12:00:00` : iso)
  if (isNaN(d.getTime())) return ''
  return `${d.toLocaleDateString(locale, { month: 'short' })} ${String(d.getFullYear()).slice(2)}`
}
