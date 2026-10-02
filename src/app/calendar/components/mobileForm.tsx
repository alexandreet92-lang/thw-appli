'use client'
// ══════════════════════════════════════════════════════════════════
// Kit MOBILE (≤ 767 px) des éditeurs Objectifs / Planning / Agenda —
// grammaire « Strava / Claude » : feuille basse (MSheet) à en-tête
// Annuler · titre · action, corps gris chaud (--surface-page), cartes
// blanches radius 20 SANS bordure, libellés gris 13 px en casse normale,
// champs pleins doux (sans bordure, ≥ 44 px), chips pilule (sélection
// sombre), lignes rouges pour la suppression. Inter uniquement.
//
// Le look est activé par un CONTEXTE posé uniquement par les coquilles
// mobiles : les composants partagés (SportFields, TriSegments…) gardent
// strictement leur rendu desktop hors de ce contexte.
// ══════════════════════════════════════════════════════════════════
import { createContext, useContext, type CSSProperties, type ReactNode } from 'react'
import { FB, CARD_BG, PAGE_BG, HAIRLINE } from '@/components/ai/mobile/MobileKit'

export { useIsMobile } from '@/components/ai/mobile/MobileKit'

const FormMCtx = createContext(false)
/** Pose le look mobile « cartes » sur tout le sous-arbre. */
export function FormMProvider({ on = true, children }: { on?: boolean; children: ReactNode }) {
  return <FormMCtx.Provider value={on}>{children}</FormMCtx.Provider>
}
/** Vrai sous une coquille d'éditeur mobile. */
export function useFormM(): boolean { return useContext(FormMCtx) }

// ── Styles ───────────────────────────────────────────────────────
/** Libellé de champ : gris 13 px, casse normale (jamais de petites capitales). */
export const M_LBL: CSSProperties = { display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-mid)', margin: '0 0 8px', fontFamily: FB, letterSpacing: 0, textTransform: 'none' }
/** Champ plein doux : sans bordure, radius 14, ≥ 48 px. */
export const M_INP: CSSProperties = {
  width: '100%', boxSizing: 'border-box', minHeight: 48, padding: '12px 14px', borderRadius: 'var(--r-md)',
  border: 'none', background: 'var(--surface-chip)', color: 'var(--text)', fontSize: 16, outline: 'none', fontFamily: FB,
}
export const M_TEXTAREA: CSSProperties = { ...M_INP, minHeight: 96, lineHeight: 1.45, resize: 'vertical' }
/** Valeur calculée (lecture seule) : fond plus doux, texte gris. */
export const M_READONLY: CSSProperties = { ...M_INP, background: 'var(--surface-soft)', color: 'var(--text-mid)', cursor: 'default', fontVariantNumeric: 'tabular-nums' }
/** Carte blanche radius 20, sans bordure. */
export const M_CARD: CSSProperties = { background: CARD_BG, borderRadius: 'var(--r-lg)', padding: 16, fontFamily: FB, minWidth: 0 }
/** Corps défilable d'une feuille (fond gris chaud). */
export const M_SCROLL: CSSProperties = {
  flex: 1, minHeight: 0, overflowY: 'auto', overscrollBehavior: 'contain', WebkitOverflowScrolling: 'touch' as CSSProperties['WebkitOverflowScrolling'],
  background: PAGE_BG, padding: '12px 16px calc(32px + env(safe-area-inset-bottom))',
  display: 'flex', flexDirection: 'column', gap: 16, fontFamily: FB,
}
/** Pied de feuille (bouton principal) sur fond gris. */
export const M_FOOTER: CSSProperties = {
  flexShrink: 0, background: PAGE_BG, padding: '10px 16px', paddingBottom: 'calc(12px + env(safe-area-inset-bottom))', fontFamily: FB,
}
export const M_GRID2: CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }

/** Chip pilule : sélection = pilule sombre ; point de couleur optionnel (sport, niveau). */
export function mChip(on: boolean): CSSProperties {
  return {
    minHeight: 44, padding: '0 16px', borderRadius: 'var(--r-pill)', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap',
    background: on ? 'var(--text)' : 'var(--surface-chip)', color: on ? 'var(--surface-card)' : 'var(--text-mid)',
    fontSize: 15, fontWeight: on ? 700 : 600, fontFamily: FB, display: 'inline-flex', alignItems: 'center', gap: 8,
    transition: 'background .15s ease, color .15s ease',
  }
}
export function MDot({ color, size = 8 }: { color: string; size?: number }) {
  return <span aria-hidden style={{ width: size, height: size, borderRadius: '50%', background: color, flexShrink: 0, display: 'inline-block' }} />
}
export const M_CHIPS: CSSProperties = { display: 'flex', gap: 8, flexWrap: 'wrap' }

// ── Blocs ────────────────────────────────────────────────────────
/** Section : libellé gris au-dessus d'une carte blanche. */
export function MSection({ label, right, children, style, bare }: {
  label?: ReactNode; right?: ReactNode; children: ReactNode; style?: CSSProperties
  /** Sans carte (contenu déjà en cartes). */
  bare?: boolean
}) {
  return (
    <section style={{ minWidth: 0 }}>
      {(label || right) && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '0 4px 8px', minHeight: 18 }}>
          <span style={{ flex: 1, minWidth: 0, fontSize: 13, fontWeight: 600, color: 'var(--text-mid)', fontFamily: FB }}>{label}</span>
          {right}
        </div>
      )}
      {bare ? children : <div style={{ ...M_CARD, ...style }}>{children}</div>}
    </section>
  )
}

/** Champ d'une carte : libellé gris + contrôle. */
export function MField({ label, children, style }: { label: ReactNode; children: ReactNode; style?: CSSProperties }) {
  return (
    <div style={{ minWidth: 0, ...style }}>
      <span style={M_LBL}>{label}</span>
      {children}
    </div>
  )
}

/** Titre de carte (17 px gras) + élément à droite. */
export function MCardTitle({ children, right, dot }: { children: ReactNode; right?: ReactNode; dot?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
      {dot && <MDot color={dot} />}
      <span style={{ flex: 1, minWidth: 0, fontSize: 17, fontWeight: 700, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{children}</span>
      {right}
    </div>
  )
}

/** Ligne destructrice (texte rouge) dans une carte blanche, ≥ 52 px. */
export function MDangerRow({ label, onClick, disabled }: { label: ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled}
      style={{ width: '100%', minHeight: 52, borderRadius: 'var(--r-lg)', border: 'none', background: CARD_BG, color: 'var(--danger)', fontSize: 16, fontWeight: 600, fontFamily: FB, cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.55 : 1 }}>
      {label}
    </button>
  )
}

/** Confirmation de suppression : question grise + ligne rouge + Annuler. */
export function MConfirmDelete({ question, confirmLabel, cancelLabel, onConfirm, onCancel, busy }: {
  question: ReactNode; confirmLabel: string; cancelLabel: string; onConfirm: () => void; onCancel: () => void; busy?: boolean
}) {
  const row: CSSProperties = { width: '100%', minHeight: 52, border: 'none', background: 'transparent', fontSize: 16, fontFamily: FB, cursor: 'pointer' }
  return (
    <div style={{ background: CARD_BG, borderRadius: 'var(--r-lg)', overflow: 'hidden', fontFamily: FB }}>
      <p style={{ margin: 0, padding: '14px 16px', fontSize: 14, color: 'var(--text-mid)', textAlign: 'center', lineHeight: 1.4 }}>{question}</p>
      <button type="button" onClick={onConfirm} disabled={busy} style={{ ...row, borderTop: HAIRLINE, color: 'var(--danger)', fontWeight: 700 }}>{busy ? '…' : confirmLabel}</button>
      <button type="button" onClick={onCancel} style={{ ...row, borderTop: HAIRLINE, color: 'var(--text)', fontWeight: 600 }}>{cancelLabel}</button>
    </div>
  )
}

/** Bouton texte compact (ajout de ligne…), cible 44 px. */
export function MTextAction({ children, onClick, color = 'var(--primary)' }: { children: ReactNode; onClick: () => void; color?: string }) {
  return (
    <button type="button" onClick={onClick}
      style={{ alignSelf: 'flex-start', minHeight: 44, padding: '0 4px', border: 'none', background: 'transparent', color, fontSize: 15, fontWeight: 600, fontFamily: FB, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      {children}
    </button>
  )
}

const SEG_SHADOW = '0 1px 3px rgba(0,0,0,0.10)' // design-allow-color — ombre du segment actif (maquette)
/** Segmenté pleine largeur : piste grise + pouce blanc, segments égaux, ≥ 44 px. */
export function MSeg<T extends string>({ value, options, onChange }: {
  value: T; options: { v: T; l: ReactNode }[]; onChange: (v: T) => void
}) {
  return (
    <div role="tablist" style={{ display: 'flex', gap: 2, padding: 3, borderRadius: 'var(--r-pill)', background: 'var(--surface-chip)', fontFamily: FB }}>
      {options.map(o => {
        const on = o.v === value
        return (
          <button key={o.v} type="button" role="tab" aria-selected={on} onClick={() => onChange(o.v)}
            style={{ flex: 1, minWidth: 0, minHeight: 44, padding: '0 6px', border: 'none', borderRadius: 'var(--r-pill)', cursor: 'pointer',
              background: on ? 'var(--surface-card)' : 'transparent', boxShadow: on ? SEG_SHADOW : 'none',
              color: on ? 'var(--text)' : 'var(--text-mid)', fontSize: 14, fontWeight: on ? 700 : 600, fontFamily: FB,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {o.l}
          </button>
        )
      })}
    </div>
  )
}
