'use client'
// ══════════════════════════════════════════════════════════════
// Nutrition mobile — briques des vues détail (Mon plan, Suivi, Poids &
// composition). Mêmes idiomes que MobileRecovery / MobileNutrition : cartes
// blanches (--dash-card) sur page grise, aucune bordure, gros chiffres Inter
// tabulaires, légendes en --text-mid / --text-dim. Couleurs en var() uniquement.
// ══════════════════════════════════════════════════════════════

import { currentLocale } from '@/lib/i18n'

export const NUM: React.CSSProperties = { fontVariantNumeric: 'tabular-nums', fontFeatureSettings: "'zero' 0" }

const I = (d: string) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>
)
export const IC = {
  plan: I('M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zM8 8h8M8 12h8M8 16h5'),
  trend: I('M3 3v18h18M7 16v-4M12 16V8M17 16v-7'),
  water: I('M12 2.7 6.3 8.4a8 8 0 1 0 11.4 0z'),
  scale: I('M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 7v5l3 2'),
}

export const fmtInt = (n: number) => Math.round(n).toLocaleString(currentLocale())
export const fmt1 = (n: number) => n.toLocaleString(currentLocale(), { maximumFractionDigits: 1, minimumFractionDigits: 1 })
export const fmtL = (n: number) => n.toLocaleString(currentLocale(), { maximumFractionDigits: 1, minimumFractionDigits: 1 })

/** « jeu 1 » — jour court + numéro. */
export function dayLabel(iso: string): string {
  const d = new Date(iso + 'T12:00:00')
  return `${d.toLocaleDateString(currentLocale(), { weekday: 'short' }).replace('.', '')} ${d.getDate()}`
}

export function Card({ children, pad = '16px 18px' }: { children: React.ReactNode; pad?: string }) {
  return <div style={{ background: 'var(--dash-card, var(--bg-card2))', borderRadius: 'var(--r-lg)', padding: pad, minWidth: 0 }}>{children}</div>
}

export function Head({ icon, title, meta, small }: { icon?: React.ReactNode; title: string; meta?: React.ReactNode; small?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, minWidth: 0 }}>
      {icon && <span aria-hidden style={{ display: 'flex', color: 'var(--primary)', flexShrink: 0 }}>{icon}</span>}
      <h2 style={{ margin: 0, flex: 1, minWidth: 0, fontSize: small ? 16 : 17, fontWeight: 700, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</h2>
      {meta != null && meta !== '' && <span style={{ ...NUM, fontSize: 14, color: 'var(--text-mid)', whiteSpace: 'nowrap', flexShrink: 0 }}>{meta}</span>}
    </div>
  )
}

/** Tuile 2×2 : libellé, gros chiffre, légende. */
export function Tile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <Card pad="14px 16px">
      <p style={{ margin: 0, fontSize: 13, color: 'var(--text-mid)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</p>
      <p style={{ ...NUM, margin: '2px 0 0', fontSize: 26, fontWeight: 800, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{value}</p>
      {sub && <p style={{ ...NUM, margin: 0, fontSize: 13, color: 'var(--text-mid)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{sub}</p>}
    </Card>
  )
}

/** Sélecteur segmenté pleine largeur (même rendu que LoadDetail de MobileRecovery). */
export function Seg<T extends string | number>({ options, value, onChange, ariaLabel }: {
  options: { id: T; label: string }[]
  value: T
  onChange: (v: T) => void
  ariaLabel?: string
}) {
  return (
    <div role="tablist" aria-label={ariaLabel} style={{ display: 'flex', background: 'var(--dash-chip, var(--bg-hover))', borderRadius: 'var(--r-pill)', padding: 3 }}>
      {options.map(o => {
        const on = o.id === value
        return (
          <button key={String(o.id)} role="tab" aria-selected={on} type="button" onClick={() => onChange(o.id)}
            style={{ flex: '1 1 auto', minWidth: 0, minHeight: 36, border: 'none', cursor: 'pointer', borderRadius: 'var(--r-pill)', padding: '7px 8px', fontSize: 14, fontWeight: on ? 700 : 600, fontFamily: 'inherit',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              background: on ? 'var(--dash-card, var(--bg-elev))' : 'transparent', color: on ? 'var(--text)' : 'var(--text-mid)',
              boxShadow: on ? 'var(--shadow-card)' : 'none' }}>
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

const CHEVRON = (
  <svg aria-hidden width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-dim)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="m9 18 6-6-6-6" /></svg>
)

/** Ligne de liste (titre + sous-titre, valeur ou chevron à droite). Tappable si onClick. */
export function ListRow({ title, sub, right, onClick, first }: {
  title: React.ReactNode
  sub?: React.ReactNode
  right?: React.ReactNode
  onClick?: () => void
  first?: boolean
}) {
  const inner = <>
    <span style={{ flex: 1, minWidth: 0 }}>
      <b style={{ display: 'block', fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>{title}</b>
      {sub != null && sub !== '' && <span style={{ ...NUM, display: 'block', marginTop: 1, fontSize: 13, color: 'var(--text-mid)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{sub}</span>}
    </span>
    {right != null && <span style={{ ...NUM, fontSize: 15, fontWeight: 700, color: 'var(--text)', whiteSpace: 'nowrap', flexShrink: 0 }}>{right}</span>}
    {onClick && CHEVRON}
  </>
  const style: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 12, width: '100%', minHeight: 44, textAlign: 'left', border: 'none', background: 'none',
    borderTop: first ? 'none' : '1px solid var(--dash-line, var(--border))', padding: first ? '0 0 12px' : '12px 0', fontFamily: 'inherit',
  }
  return onClick
    ? <button type="button" onClick={onClick} className="thw-press" style={{ ...style, cursor: 'pointer' }}>{inner}</button>
    : <div style={style}>{inner}</div>
}

/** Carte liste : les lignes se séparent par un filet ; la dernière sans marge basse. */
export function ListCard({ children }: { children: React.ReactNode }) {
  return <Card><div className="ntm-list">{children}</div><style>{'.ntm-list>*:last-child{padding-bottom:0!important}'}</style></Card>
}

export function PrimaryPill({ children, onClick, disabled }: { children: React.ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} className="thw-press"
      style={{ width: '100%', minHeight: 50, borderRadius: 'var(--r-pill)', border: 'none', background: 'var(--primary)', color: 'var(--on-primary)', fontSize: 16, fontWeight: 700, cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.6 : 1, fontFamily: 'inherit' }}>
      {children}
    </button>
  )
}

export function Dot({ color, size = 8 }: { color: string; size?: number }) {
  return <span aria-hidden style={{ width: size, height: size, borderRadius: '50%', background: color, display: 'inline-block', flexShrink: 0 }} />
}
