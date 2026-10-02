'use client'
// ══════════════════════════════════════════════════════════════════
// Kit « cartes » du SessionEditor MOBILE (maquette validée mock7) :
// page grise (--surface-page), cartes blanches radius 20 sans bordure,
// Inter partout, gros chiffres gras, segmentés gris, chips pilule,
// boutons ronds flottants (--float-bg). Tokens uniquement (clair/sombre
// gérés par globals.css). Cibles tactiles ≥ 44 px.
//
// Le look est activé par un CONTEXTE posé UNIQUEMENT par la coquille
// mobile (SessionEditorMobile). Les composants partagés (desktop, saisie
// manuelle Record…) ne le voient pas → leur rendu reste strictement inchangé.
// ══════════════════════════════════════════════════════════════════
import { createContext, useContext } from 'react'
import type { ReactNode, CSSProperties } from 'react'

const SeMobileCtx = createContext(false)

/** Pose le look « cartes » mobile sur tout le sous-arbre. */
export function SeMobileProvider({ children }: { children: ReactNode }) {
  return <SeMobileCtx.Provider value>{children}</SeMobileCtx.Provider>
}
/** Vrai sous la coquille mobile du SessionEditor. */
export function useSeM(): boolean { return useContext(SeMobileCtx) }

// ── Feuille de style scoppée à `.se-m` (ajoutée APRÈS EDITORIAL_CSS) ──
// Remappe les tokens --se-* sur les surfaces des pages « cartes » mobiles
// et supprime toute police display (aucun Fraunces sur mobile).
export const SEM_CSS = `
.se-m {
  --se-bg: var(--surface-page);
  --se-card: var(--surface-card);
  --se-card2: var(--surface-chip);
  --se-dim: var(--text-mid);
  --se-rule: var(--border);
  --sem-field: var(--surface-chip);
  --sem-tile: var(--surface-card);
  background: var(--surface-page);
}
.se-m, .se-m * { font-family: var(--font-body) !important; }
.se-m .se-fr { letter-spacing: -0.01em; }
.se-m .se-tnum { font-variant-numeric: tabular-nums; font-feature-settings: 'zero' 0; }
.se-m .sem-noscroll { scrollbar-width: none; }
.se-m .sem-noscroll::-webkit-scrollbar { display: none; }
.se-m textarea::placeholder, .se-m input::placeholder { color: var(--text-dim); }
`

// Ombres (pas des couleurs de surface) — tolérées hors tokens.
export const SEG_SHADOW = '0 1px 3px rgba(0,0,0,0.10)' // design-allow-color — ombre du segment actif (maquette)
export const THUMB_SHADOW = '0 1px 6px rgba(0,0,0,0.25)' // design-allow-color — ombre du pouce de jauge (maquette)
/** Pouce de jauge : blanc dans les deux thèmes (maquette validée). */
export const THUMB_BG = '#ffffff' // design-allow-color — pouce blanc de la jauge (maquette clair + sombre)

/** Carte blanche radius 20, sans bordure. */
export const mCard: CSSProperties = { background: 'var(--surface-card)', borderRadius: 'var(--r-lg)', padding: 16 }

export function MCard({ children, style, title, right, ...rest }: {
  children: ReactNode; style?: CSSProperties; title?: ReactNode; right?: ReactNode
} & Omit<React.HTMLAttributes<HTMLDivElement>, 'title' | 'style' | 'children'>) {
  return (
    <div {...rest} style={{ ...mCard, ...style }}>
      {(title || right) && <MCardHead right={right}>{title}</MCardHead>}
      {children}
    </div>
  )
}

/** En-tête de carte : libellé 13 px gras gris + action à droite. */
export function MCardHead({ children, right, mb = 12 }: { children?: ReactNode; right?: ReactNode; mb?: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: mb, minHeight: 18 }}>
      <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-mid)' }}>{children}</span>
      {right}
    </div>
  )
}

/** Titre de section (« Construction ») 20 px 800 + élément à droite. */
export function MSectionTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, margin: '12px 4px 12px' }}>
      <h3 style={{ margin: 0, fontSize: 20, fontWeight: 800, letterSpacing: '-0.01em', color: 'var(--text)', minWidth: 0 }}>{children}</h3>
      {right}
    </div>
  )
}

/** Segmenté gris pleine largeur (segment actif = carte + ombre). */
export function MSeg<T extends string>({ value, options, onChange, fit, small }: {
  value: T; options: { key: T; label: ReactNode; disabled?: boolean }[]; onChange: (v: T) => void
  /** Segments dimensionnés au contenu (libellés longs). */
  fit?: boolean
  small?: boolean
}) {
  return (
    <div role="tablist" style={{ display: 'flex', gap: 2, padding: 3, borderRadius: 'var(--r-pill)', background: 'var(--sem-field)', minWidth: 0 }}>
      {options.map(o => {
        const on = o.key === value
        return (
          <button key={o.key} type="button" role="tab" aria-selected={on} disabled={o.disabled} onClick={() => onChange(o.key)} style={{
            flex: fit ? '1 1 auto' : 1, minWidth: 0, minHeight: 38, padding: '0 10px',
            border: 'none', borderRadius: 'var(--r-pill)', cursor: o.disabled ? 'default' : 'pointer',
            background: on ? 'var(--float-bg)' : 'transparent', boxShadow: on ? SEG_SHADOW : 'none',
            color: on ? 'var(--text)' : 'var(--text-mid)', fontSize: small ? 13 : 14, fontWeight: on ? 700 : 600,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
          }}>{o.label}</button>
        )
      })}
    </div>
  )
}

/** Chip pilule (sélection = pilule sombre). */
export function mChip(on: boolean): CSSProperties {
  return {
    minHeight: 40, padding: '0 14px', borderRadius: 'var(--r-pill)', border: 'none', cursor: 'pointer',
    background: on ? 'var(--text)' : 'var(--sem-field)', color: on ? 'var(--surface-card)' : 'var(--text-mid)',
    fontSize: 14, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap',
  }
}

/** Petite chip (éditeurs de blocs) — même grammaire, plus compacte. */
export function mChipSm(on: boolean): CSSProperties {
  return { ...mChip(on), minHeight: 36, padding: '0 12px', fontSize: 13 }
}

/** Bouton rond flottant blanc (header / footer). */
export function roundBtn(size = 44): CSSProperties {
  return {
    width: size, height: size, borderRadius: '50%', border: 'none', flexShrink: 0, cursor: 'pointer',
    background: 'var(--float-bg)', color: 'var(--text)', boxShadow: 'var(--shadow-capsule)',
    display: 'grid', placeItems: 'center', padding: 0,
  }
}

/** Grille de tuiles KPI (3 colonnes). */
export function MKpis({ cells, cols = 3 }: { cells: { label: string; value: string; color?: string }[]; cols?: number }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(cols, Math.max(1, cells.length))}, minmax(0,1fr))`, gap: 8 }}>
      {cells.map(c => (
        <div key={c.label} style={{ background: 'var(--sem-tile)', borderRadius: 'var(--r-md)', padding: 12, minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: 'var(--text-mid)', lineHeight: 1.25 }}>{c.label}</p>
          <p className="se-tnum" style={{ margin: '4px 0 0', fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em', color: c.color ?? 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.value}</p>
        </div>
      ))}
    </div>
  )
}

/** Filet séparateur des listes groupées. */
export const HAIR = '1px solid var(--border)'
