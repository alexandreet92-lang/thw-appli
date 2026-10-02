'use client'
// ══════════════════════════════════════════════════════════════
// Kit MOBILE (≤ 767 px) des écrans Activités — grammaire « Strava » :
// page / feuille gris chaud (--surface-page), cartes blanches radius 20
// sans bordure, titres Inter 17 700, libellés gris 13 en casse normale,
// listes groupées séparées par un filet, champs pleins doux (sans bordure),
// puces pilules, bouton principal cyan pleine largeur, rangées destructives
// en texte rouge. Repose sur MobileKit (surpages IA) pour rester cohérent.
// Bureau : rien ici n'est utilisé (chaque écran garde son rendu d'origine).
// ══════════════════════════════════════════════════════════════
import type { CSSProperties, ReactNode } from 'react'
import {
  FB, CARD_BG, PAGE_BG, SOFT_SHADOW, HAIRLINE, useIsMobile, MSheet, SheetHeader, SegTrack, PillButton,
  RoundBtn, Ico, ICON, roundBtnStyle, Chevron,
} from '@/components/ai/mobile/MobileKit'

export { FB, CARD_BG, PAGE_BG, SOFT_SHADOW, HAIRLINE, useIsMobile, MSheet, SheetHeader, SegTrack, PillButton, RoundBtn, Ico, ICON, roundBtnStyle, Chevron }

/** Chiffres : Inter tabulaire, zéro non barré. */
export const NUMS: CSSProperties = { fontVariantNumeric: 'tabular-nums', fontFeatureSettings: "'zero' 0" }

/** Carte blanche radius 20, sans bordure. */
export const AM_CARD: CSSProperties = {
  background: CARD_BG, borderRadius: 'var(--r-lg)', padding: 16, boxShadow: SOFT_SHADOW,
  fontFamily: FB, border: 'none', boxSizing: 'border-box', minWidth: 0,
}
/** Titre de carte / de section (Inter 17 700). */
export const AM_TITLE: CSSProperties = { margin: 0, fontSize: 17, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.01em', fontFamily: FB, lineHeight: 1.25 }
/** Libellé gris 13, casse normale. */
export const AM_LABEL: CSSProperties = { fontSize: 13, fontWeight: 500, color: 'var(--text-mid)', fontFamily: FB, lineHeight: 1.3 }
/** Champ plein doux : aucun cadre, radius 14, ≥ 48 px. */
export const AM_INPUT: CSSProperties = {
  width: '100%', boxSizing: 'border-box', minHeight: 48, padding: '12px 14px', border: 'none', outline: 'none',
  borderRadius: 'var(--r-md)', background: 'var(--surface-chip)', color: 'var(--text)', fontSize: 16, fontFamily: FB,
}

/** Puce pilule (active = pilule sombre). */
export function amChip(on: boolean): CSSProperties {
  return {
    minHeight: 44, padding: '0 16px', borderRadius: 'var(--r-pill)', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap',
    background: on ? 'var(--text)' : 'var(--surface-chip)', color: on ? 'var(--bg)' : 'var(--text)',
    fontSize: 15, fontWeight: 600, fontFamily: FB, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
  }
}

/** Libellé de section au-dessus d'une carte (gris 15, casse normale). */
export function AmSectionLabel({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '22px 4px 8px' }}>
      <span style={{ flex: 1, fontSize: 15, fontWeight: 500, color: 'var(--text-mid)', fontFamily: FB }}>{children}</span>
      {right}
    </div>
  )
}

/** Carte blanche avec titre facultatif (+ action à droite). */
export function AmCard({ title, sub, right, children, style, pad = 16 }: {
  title?: ReactNode; sub?: ReactNode; right?: ReactNode; children?: ReactNode; style?: CSSProperties; pad?: number
}) {
  return (
    <section style={{ ...AM_CARD, padding: pad, ...style }}>
      {(title || right) && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: children ? 12 : 0, minWidth: 0 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            {title && <h2 style={AM_TITLE}>{title}</h2>}
            {sub && <p style={{ ...AM_LABEL, margin: '3px 0 0' }}>{sub}</p>}
          </div>
          {right}
        </div>
      )}
      {children}
    </section>
  )
}

/** Ligne « libellé gris · valeur » d'une liste groupée (filet au-dessus sauf la première). */
export function AmRow({ label, value, first, valueColor, onClick, sub }: {
  label: ReactNode; value?: ReactNode; first?: boolean; valueColor?: string; onClick?: () => void; sub?: ReactNode
}) {
  const style: CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 12, width: '100%', minHeight: 48, padding: '10px 0', boxSizing: 'border-box',
    border: 'none', borderTop: first ? 'none' : HAIRLINE, background: 'transparent', fontFamily: FB, textAlign: 'left',
    cursor: onClick ? 'pointer' : undefined, color: 'var(--text)',
  }
  const inner = (
    <>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: 'block', fontSize: 15, color: 'var(--text-mid)', lineHeight: 1.3 }}>{label}</span>
        {sub && <span style={{ display: 'block', fontSize: 13, color: 'var(--text-dim)', marginTop: 2 }}>{sub}</span>}
      </span>
      {value != null && value !== '' && (
        <span style={{ ...NUMS, fontSize: 15, fontWeight: 600, color: valueColor ?? 'var(--text)', textAlign: 'right', whiteSpace: 'nowrap' }}>{value}</span>
      )}
      {onClick && <Chevron />}
    </>
  )
  if (!onClick) return <div style={style}>{inner}</div>
  return <button type="button" onClick={onClick} style={style}>{inner}</button>
}

/** Liste groupée de lignes label/valeur. */
export function AmRows({ rows }: { rows: { label: ReactNode; value: ReactNode; color?: string; key?: string }[] }) {
  return (
    <div>
      {rows.map((r, i) => <AmRow key={r.key ?? (typeof r.label === 'string' ? r.label : i)} label={r.label} value={r.value} valueColor={r.color} first={i === 0} />)}
    </div>
  )
}

/** Grille de KPI façon Strava : libellé gris au-dessus, gros chiffre. */
export function AmKpis({ items, cols = 3 }: { items: { label: ReactNode; value: ReactNode; unit?: string; key?: string }[]; cols?: number }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, columnGap: 12, rowGap: 16 }}>
      {items.map((s, i) => (
        <div key={s.key ?? (typeof s.label === 'string' ? s.label : i)} style={{ minWidth: 0 }}>
          <div style={{ ...AM_LABEL, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.label}</div>
          <div style={{ ...NUMS, marginTop: 3, fontSize: 20, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.01em', lineHeight: 1.15, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {s.value}{s.unit && <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-mid)', marginLeft: 3 }}>{s.unit}</span>}
          </div>
        </div>
      ))}
    </div>
  )
}

/** Rangée destructive : carte blanche, texte rouge centré, ≥ 52 px. */
export function AmDangerRow({ children, onClick, disabled, icon, bg = CARD_BG }: { children: ReactNode; onClick: () => void; disabled?: boolean; icon?: ReactNode; bg?: string }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled}
      style={{ width: '100%', minHeight: 52, border: 'none', borderRadius: 'var(--r-lg)', background: bg, boxShadow: bg === CARD_BG ? SOFT_SHADOW : 'none',
        color: 'var(--danger)', fontSize: 16, fontWeight: 600, fontFamily: FB, cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.55 : 1,
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
      {icon}{children}
    </button>
  )
}

/** Bouton secondaire pilule (fond gris doux). */
export function AmSoftButton({ children, onClick, disabled, style }: { children: ReactNode; onClick: () => void; disabled?: boolean; style?: CSSProperties }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled}
      style={{ minHeight: 44, padding: '0 18px', border: 'none', borderRadius: 'var(--r-pill)', background: 'var(--surface-chip)', color: 'var(--text)',
        fontSize: 15, fontWeight: 600, fontFamily: FB, cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.55 : 1,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, ...style }}>
      {children}
    </button>
  )
}

/** Corps défilable d'une feuille (MSheet) : fond gris chaud, marges 16. */
export function AmSheetBody({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: '4px 16px calc(env(safe-area-inset-bottom, 0px) + 20px)', display: 'flex', flexDirection: 'column', gap: 12, ...style }}>
      {children}
    </div>
  )
}

/** Feuille du bas complète : poignée + en-tête (Annuler · titre · action) + corps.
 *  `full` = hauteur max ; sinon la feuille s'ajuste au contenu. */
export function AmSheet({ open, onClose, title, leftLabel, rightLabel, onRight, rightDisabled, children, full = false, zIndex }: {
  open: boolean; onClose: () => void; title: ReactNode; leftLabel: string
  rightLabel?: string; onRight?: () => void; rightDisabled?: boolean; children: ReactNode; full?: boolean; zIndex?: number
}) {
  return (
    <MSheet open={open} onClose={onClose} full={full} zIndex={zIndex} label={typeof title === 'string' ? title : undefined}>
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0, flex: 1 }}>
        <div style={{ paddingTop: 4 }}>
          <SheetHeader leftLabel={leftLabel} onLeft={onClose} title={title} rightLabel={rightLabel} onRight={onRight} rightDisabled={rightDisabled} />
        </div>
        <AmSheetBody>{children}</AmSheetBody>
      </div>
    </MSheet>
  )
}

/** Cadre plein écran mobile d'une feuille « contenu » (gris chaud + cartes
 *  blanches) : poignée, titre 20 800, sous-titre gris, bouton rond ×. */
export function AmPanelHeader({ title, sub, onClose, closeLabel }: { title: ReactNode; sub?: ReactNode; onClose: () => void; closeLabel: string }) {
  return (
    <div style={{ flexShrink: 0, padding: '0 16px 10px', fontFamily: FB }}>
      <div aria-hidden style={{ display: 'flex', justifyContent: 'center', padding: '8px 0 10px' }}>
        <span style={{ width: 38, height: 5, borderRadius: 'var(--r-pill)', background: 'var(--surface-bar)' }} />
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.02em', lineHeight: 1.15 }}>{title}</div>
          {sub && <div style={{ ...AM_LABEL, ...NUMS, marginTop: 4 }}>{sub}</div>}
        </div>
        <RoundBtn label={closeLabel} onClick={onClose}><Ico d={ICON.close} size={20} sw={2.2} /></RoundBtn>
      </div>
    </div>
  )
}
