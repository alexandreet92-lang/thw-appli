'use client'
// ══════════════════════════════════════════════════════════════
// Nutrition mobile — briques des vues détail (Mon plan, Suivi, Poids &
// composition). Mêmes idiomes que MobileRecovery / MobileNutrition : cartes
// blanches (--dash-card) sur page grise, aucune bordure, gros chiffres Inter
// tabulaires, légendes en --text-mid / --text-dim. Couleurs en var() uniquement.
// ══════════════════════════════════════════════════════════════

import { useCallback, useRef, useState, type CSSProperties, type ReactNode } from 'react'
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

// ══════════════════════════════════════════════════════════════
// Feuilles mobiles (MSheet de MobileKit) — briques de formulaire.
// Fond de feuille blanc (--surface-card), champs « doux » remplis gris
// (--surface-chip), sans bordure, rayon 14, ≥ 48 px ; libellés gris 13 px
// en casse de phrase ; listes groupées séparées par un filet.
// ══════════════════════════════════════════════════════════════

/** Fermeture animée d'une feuille montée conditionnellement par son parent :
 *  on replie d'abord (open=false → animation de sortie) puis on démonte. */
export function useSheetClose(onClose: () => void, ms = 360): [boolean, () => void] {
  const [open, setOpen] = useState(true)
  const done = useRef(false)
  const close = useCallback(() => {
    if (done.current) return
    done.current = true
    setOpen(false)
    setTimeout(onClose, ms)
  }, [onClose, ms])
  return [open, close]
}

/** Champ rempli doux (aucune bordure ; halo cyan au focus via la classe ntm-in). */
export const M_INPUT: CSSProperties = {
  width: '100%', minWidth: 0, minHeight: 48, padding: '0 14px', boxSizing: 'border-box', border: 'none', borderRadius: 'var(--r-md)',
  background: 'var(--surface-chip)', color: 'var(--text)', fontFamily: 'var(--font-body)', fontSize: 16, outline: 'none',
  fontVariantNumeric: 'tabular-nums',
}
/** Styles partagés des feuilles mobiles (focus des champs). À poser une fois par feuille. */
export const M_SHEET_CSS = '.ntm-in:focus{box-shadow:0 0 0 2px var(--primary)}.ntm-in::placeholder{color:var(--text-dim)}'

/** Libellé gris 13 px au-dessus d'un champ (casse de phrase). */
export function MLabel({ children, htmlFor }: { children: ReactNode; htmlFor?: string }) {
  return <label htmlFor={htmlFor} style={{ display: 'block', margin: '0 0 6px 4px', fontSize: 13, fontWeight: 500, color: 'var(--text-mid)', fontFamily: 'var(--font-body)' }}>{children}</label>
}

/** Champ avec libellé ; `unit` s'affiche intégré à droite du champ. */
export function MField({ label, unit, children }: { label?: ReactNode; unit?: string; children: ReactNode }) {
  return (
    <div style={{ minWidth: 0 }}>
      {label != null && <MLabel>{label}</MLabel>}
      {unit ? (
        <div style={{ position: 'relative' }}>
          {children}
          <span aria-hidden style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 15, color: 'var(--text-dim)', pointerEvents: 'none', fontFamily: 'var(--font-body)' }}>{unit}</span>
        </div>
      ) : children}
    </div>
  )
}

/** Zone défilable d'une feuille (sous l'en-tête). */
export function SheetBody({ children, gap = 16, style }: { children: ReactNode; gap?: number; style?: CSSProperties }) {
  return (
    <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: '8px 16px calc(24px + env(safe-area-inset-bottom))', display: 'flex', flexDirection: 'column', gap, boxSizing: 'border-box', ...style }}>
      {children}
    </div>
  )
}

/** Pied de feuille fixe (bouton principal pleine largeur). */
export function SheetFooter({ children }: { children: ReactNode }) {
  return <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 8, padding: '10px 16px calc(12px + env(safe-area-inset-bottom))' }}>{children}</div>
}

/** Bloc gris arrondi (liste groupée posée sur une feuille blanche). */
export function SoftGroup({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return <div style={{ background: 'var(--surface-chip)', borderRadius: 'var(--r-lg)', overflow: 'hidden', ...style }}>{children}</div>
}

/** Ligne de liste groupée (filet encarté au-dessus sauf la première). */
export function SoftRow({ first, children, onClick, style, label }: { first?: boolean; children: ReactNode; onClick?: () => void; style?: CSSProperties; label?: string }) {
  const base: CSSProperties = { position: 'relative', display: 'flex', alignItems: 'center', gap: 12, width: '100%', minHeight: 52, padding: '10px 16px', boxSizing: 'border-box', textAlign: 'left', fontFamily: 'var(--font-body)', color: 'var(--text)', ...style }
  const rule = first ? null : <span aria-hidden style={{ position: 'absolute', top: 0, left: 16, right: 16, height: 1, background: 'var(--border)' }} />
  if (!onClick) return <div style={base}>{rule}{children}</div>
  return <button type="button" onClick={onClick} aria-label={label} className="thw-press" style={{ ...base, border: 'none', background: 'transparent', cursor: 'pointer' }}>{rule}{children}</button>
}

/** Bouton pilule pleine largeur. primary = cyan ; soft = gris ; danger = texte rouge. */
export function MButton({ children, onClick, variant = 'primary', disabled, style }: {
  children: ReactNode; onClick: () => void; variant?: 'primary' | 'soft' | 'danger'; disabled?: boolean; style?: CSSProperties
}) {
  const v: CSSProperties = variant === 'primary'
    ? { background: 'var(--primary)', color: 'var(--on-primary)' }
    : variant === 'danger'
      ? { background: 'var(--surface-chip)', color: 'var(--danger)' }
      : { background: 'var(--surface-chip)', color: 'var(--text)' }
  return (
    <button type="button" onClick={onClick} disabled={disabled} className="thw-press"
      style={{ width: '100%', minHeight: 50, borderRadius: 'var(--r-pill)', border: 'none', cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.5 : 1,
        fontSize: 16, fontWeight: 700, fontFamily: 'var(--font-body)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, ...v, ...style }}>
      {children}
    </button>
  )
}

/** Puce pilule (sélectionnée = sombre), cible 44 px. */
export function MPill({ children, on, onClick, disabled }: { children: ReactNode; on?: boolean; onClick: () => void; disabled?: boolean }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={on} disabled={disabled}
      style={{ flexShrink: 0, minHeight: 44, padding: '0 16px', borderRadius: 'var(--r-pill)', border: 'none', cursor: disabled ? 'default' : 'pointer', whiteSpace: 'nowrap',
        background: on ? 'var(--text)' : 'var(--surface-chip)', color: on ? 'var(--bg)' : 'var(--text)', opacity: disabled ? 0.45 : 1,
        fontSize: 15, fontWeight: 600, fontFamily: 'var(--font-body)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
      {children}
    </button>
  )
}
