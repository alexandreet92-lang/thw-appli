'use client'
// ══════════════════════════════════════════════════════════════════
// Séances — kit MOBILE (≤ 767 px) de la Bibliothèque et du Builder.
// Grammaire « Strava / Claude » : page gris chaud, cartes blanches radius 20
// sans bordure, gros titres Inter 800, libellés gris en casse de phrase,
// listes groupées à filets, pilules (sélection = sombre), bouton principal
// cyan pleine largeur, feuilles du bas MSheet (poignée + en-tête).
// Activé par SessionMobileProvider (posé par la page /session en mobile) :
// le rendu bureau ne change jamais. Tokens uniquement, cibles ≥ 44 px.
// ══════════════════════════════════════════════════════════════════
import { createContext, useContext, type CSSProperties, type ReactNode } from 'react'
import { IconAdjustmentsHorizontal, IconArrowLeft, IconSearch } from '@tabler/icons-react'
import { MSheet, SheetHeader } from '@/components/ai/mobile/MobileKit'

const FB = 'var(--font-body)'
export const S_CARD = 'var(--dash-card, var(--surface-card))'
export const S_CHIP = 'var(--surface-chip)'

// ── Contexte : vrai dans la mise en page mobile de /session ─────────
const SessionMobileCtx = createContext(false)
export function SessionMobileProvider({ children }: { children: ReactNode }) {
  return <SessionMobileCtx.Provider value>{children}</SessionMobileCtx.Provider>
}
export function useSessionMobile(): boolean { return useContext(SessionMobileCtx) }

// ── Navigation / titres ────────────────────────────────────────────
/** Lien retour « ‹ Libellé » cyan (comme DetailSlide), cible 44 px. */
export function MBack({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick}
      style={{ alignSelf: 'flex-start', display: 'inline-flex', alignItems: 'center', gap: 2, minHeight: 44, border: 'none', background: 'none', padding: '0 8px 0 0', margin: '-6px 0 0 -4px', cursor: 'pointer', fontSize: 16, fontWeight: 600, color: 'var(--primary)', fontFamily: FB }}>
      <svg aria-hidden width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
      {label}
    </button>
  )
}

/** Titre d'écran (Inter 26/800) + texte d'intro gris optionnel. */
export function MTitle({ children, sub, dot }: { children: ReactNode; sub?: ReactNode; dot?: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 10, fontFamily: FB, fontSize: 26, fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.15, color: 'var(--text)' }}>
        {dot && <span aria-hidden style={{ width: 10, height: 10, borderRadius: '50%', background: dot, flexShrink: 0 }} />}
        <span style={{ minWidth: 0 }}>{children}</span>
      </h2>
      {sub && <p style={{ margin: 0, fontFamily: FB, fontSize: 15, color: 'var(--text-mid)', lineHeight: 1.45 }}>{sub}</p>}
    </div>
  )
}

/** Titre de section 17/700. */
export function MH3({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, margin: '6px 4px 0' }}>
      <h3 style={{ flex: 1, margin: 0, fontFamily: FB, fontSize: 17, fontWeight: 700, color: 'var(--text)' }}>{children}</h3>
      {right}
    </div>
  )
}

/** Libellé gris 13 px (casse de phrase). */
export function MLabel({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return <p style={{ margin: '0 4px 8px', fontFamily: FB, fontSize: 13, fontWeight: 500, color: 'var(--text-mid)', ...style }}>{children}</p>
}

// ── Surfaces ───────────────────────────────────────────────────────
/** Carte blanche radius 20, sans bordure. */
export function MCardBox({ children, style, pad = '16px 18px' }: { children: ReactNode; style?: CSSProperties; pad?: string }) {
  return <div style={{ background: S_CARD, borderRadius: 'var(--r-lg)', padding: pad, minWidth: 0, fontFamily: FB, ...style }}>{children}</div>
}

/** Liste groupée (carte blanche, lignes séparées par un filet). */
export function MList({ children }: { children: ReactNode }) {
  return <div style={{ background: S_CARD, borderRadius: 'var(--r-lg)', overflow: 'hidden', fontFamily: FB }}>{children}</div>
}

/** Filet encarté (16 px) au-dessus d'une ligne de liste. */
export function MRule() {
  return <span aria-hidden style={{ position: 'absolute', top: 0, left: 16, right: 16, height: 1, background: 'var(--dash-line, var(--border))' }} />
}

/** Puce/étiquette grise (lecture seule). */
export function MTag({ children, accent }: { children: ReactNode; accent?: boolean }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', minHeight: 28, padding: '0 10px', borderRadius: 'var(--r-pill)', background: accent ? 'var(--primary-dim)' : S_CHIP,
      color: accent ? 'var(--primary)' : 'var(--text-mid)', fontFamily: FB, fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap' }}>
      {children}
    </span>
  )
}

/** Pilule de choix (sélection = sombre), cible 44 px. */
export function MPill({ active, onClick, children, disabled }: { active: boolean; onClick: () => void; children: ReactNode; disabled?: boolean }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={active} disabled={disabled}
      style={{ flexShrink: 0, minHeight: 44, padding: '0 16px', borderRadius: 'var(--r-pill)', border: 'none', cursor: disabled ? 'default' : 'pointer', whiteSpace: 'nowrap',
        background: active ? 'var(--text)' : S_CHIP, color: active ? 'var(--bg)' : 'var(--text)', opacity: disabled ? 0.45 : 1,
        fontFamily: FB, fontSize: 15, fontWeight: 600, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, transition: 'background .15s, color .15s' }}>
      {children}
    </button>
  )
}

/** Bouton pilule pleine largeur (cyan par défaut). */
export function MPrimary({ children, onClick, disabled, soft, style }: { children: ReactNode; onClick: () => void; disabled?: boolean; soft?: boolean; style?: CSSProperties }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} className="thw-press"
      style={{ width: '100%', minHeight: 50, borderRadius: 'var(--r-pill)', border: 'none', cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.55 : 1,
        background: soft ? S_CHIP : 'var(--primary)', color: soft ? 'var(--text)' : 'var(--on-primary)',
        fontFamily: FB, fontSize: 16, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, ...style }}>
      {children}
    </button>
  )
}

/** Lien texte cyan (Effacer les filtres…), cible 44 px. */
export function MTextLink({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick}
      style={{ alignSelf: 'flex-start', minHeight: 44, padding: '0 4px', border: 'none', background: 'none', cursor: 'pointer', fontFamily: FB, fontSize: 15, fontWeight: 600, color: 'var(--primary)' }}>
      {children}
    </button>
  )
}

/** État vide : carte blanche, titre 17/700 + aide grise. */
export function MEmpty({ title, hint, children }: { title: string; hint?: string; children?: ReactNode }) {
  return (
    <MCardBox pad="20px 18px">
      <p style={{ margin: 0, fontSize: 17, fontWeight: 700, color: 'var(--text)' }}>{title}</p>
      {hint && <p style={{ margin: '6px 0 0', fontSize: 15, color: 'var(--text-mid)', lineHeight: 1.45 }}>{hint}</p>}
      {children}
    </MCardBox>
  )
}

// ── Recherche + filtre ─────────────────────────────────────────────
/** Champ recherche (pilule blanche 48 px, halo cyan au focus). */
export function MSearchField({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <label className="sesm-search" style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 8, minHeight: 48, padding: '0 16px', borderRadius: 'var(--r-pill)', background: S_CARD, cursor: 'text', fontFamily: FB }}>
      <style>{'.sesm-in::placeholder{color:var(--text-dim)}.sesm-search:focus-within{box-shadow:0 0 0 2px var(--primary)}'}</style>
      <IconSearch size={18} style={{ color: 'var(--text-dim)', flexShrink: 0 }} />
      <input className="sesm-in" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} aria-label={placeholder}
        style={{ flex: 1, minWidth: 0, border: 'none', outline: 'none', background: 'transparent', color: 'var(--text)', fontFamily: FB, fontSize: 16 }} />
    </label>
  )
}

/** Bouton filtre rond 48 px (sombre quand des filtres sont actifs + pastille du nombre). */
export function MFilterRound({ n, onClick, label }: { n: number; onClick: () => void; label: string }) {
  const on = n > 0
  return (
    <button type="button" onClick={onClick} aria-label={label}
      style={{ position: 'relative', width: 48, height: 48, flexShrink: 0, borderRadius: '50%', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: on ? 'var(--text)' : S_CARD, color: on ? 'var(--bg)' : 'var(--text)' }}>
      <IconAdjustmentsHorizontal size={20} />
      {on && (
        <span style={{ position: 'absolute', top: -2, right: -2, minWidth: 20, height: 20, padding: '0 5px', boxSizing: 'border-box', borderRadius: 'var(--r-pill)', background: 'var(--primary)', color: 'var(--on-primary)',
          fontFamily: FB, fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', fontVariantNumeric: 'tabular-nums' }}>{n}</span>
      )}
    </button>
  )
}

// ── Briques adaptatives des écrans liste / détail ───────────────────
// Rendu bureau STRICTEMENT identique à l'existant ; rendu mobile natif.

/** Retour : bureau « ← Libellé » gris 13 ; mobile « ‹ Libellé » cyan 44 px. */
export function ABack({ label, onClick }: { label: string; onClick: () => void }) {
  const m = useSessionMobile()
  if (m) return <div style={{ marginBottom: 4 }}><MBack label={label} onClick={onClick} /></div>
  return (
    <button onClick={onClick} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none',
      cursor: 'pointer', color: 'var(--text-mid)', fontFamily: FB, fontSize: 13, padding: '4px 0', marginBottom: 'var(--space-4)' }}>
      <IconArrowLeft size={16} /> {label}
    </button>
  )
}

/** Titre d'écran : bureau serif 24/600 ; mobile Inter 26/800. */
export function ATitle({ children, mb = 'var(--space-4)' }: { children: ReactNode; mb?: string }) {
  const m = useSessionMobile()
  if (m) return <h2 style={{ margin: '0 0 14px', fontFamily: FB, fontSize: 26, fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.15, color: 'var(--text)' }}>{children}</h2>
  return <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 600, color: 'var(--text)', margin: `0 0 ${mb}` }}>{children}</h2>
}

/** Lien « Effacer les filtres ». */
export function AClear({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  const m = useSessionMobile()
  if (m) return <div style={{ margin: '-6px 0 6px' }}><MTextLink onClick={onClick}>{children}</MTextLink></div>
  return (
    <button onClick={onClick} style={{ background: 'none', border: 'none', cursor: 'pointer',
      color: 'var(--primary)', fontFamily: FB, fontSize: 12.5, padding: '0 0 var(--space-3)' }}>{children}</button>
  )
}

/** État vide d'une liste filtrée. */
export function AEmpty({ title, hint }: { title: string; hint: string }) {
  const m = useSessionMobile()
  if (m) return <MEmpty title={title} hint={hint} />
  return (
    <div style={{ padding: '48px 24px', borderRadius: 'var(--r-lg)', background: 'var(--bg-card2)', textAlign: 'center' }}>
      <p style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 600, color: 'var(--text)', margin: '0 0 6px' }}>{title}</p>
      <p style={{ fontFamily: FB, fontSize: 13, color: 'var(--text-dim)', margin: 0 }}>{hint}</p>
    </div>
  )
}

/** Style d'une carte de résultat (séance / exercice). */
export function resultCardStyle(m: boolean): CSSProperties {
  return m
    ? { display: 'flex', flexDirection: 'column', gap: 12, width: '100%', textAlign: 'left', padding: '16px 16px 14px', borderRadius: 'var(--r-lg)', border: 'none', cursor: 'pointer', background: S_CARD, fontFamily: FB }
    : { display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', width: '100%', textAlign: 'left', padding: 'var(--space-4)', borderRadius: 'var(--r-md)', border: 'none', cursor: 'pointer', background: 'var(--bg-card2)' }
}

// ── Feuille de filtre ──────────────────────────────────────────────
/** Vrai à l'intérieur d'une MFilterSheet : les Chip / Bloc locaux passent en rendu mobile. */
const FilterSheetCtx = createContext(false)
export function useInFilterSheet(): boolean { return useContext(FilterSheetCtx) }

/** Feuille de filtre : poignée + « Effacer » · titre, sections, pied cyan « Voir N … »
 *  (ferme). Le voile et la poignée ferment aussi. */
export function MFilterSheet({ open, onClose, title, resetLabel, onReset, applyLabel, children }: {
  open: boolean; onClose: () => void; title: string; resetLabel: string; onReset: () => void; applyLabel: string; children: ReactNode
}) {
  return (
    <MSheet open={open} onClose={onClose} full={false} label={title}>
      <SheetHeader leftLabel={resetLabel} onLeft={onReset} title={title} />
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: '8px 16px 8px' }}>
        <FilterSheetCtx.Provider value>{children}</FilterSheetCtx.Provider>
      </div>
      <div style={{ flexShrink: 0, padding: '10px 16px calc(12px + env(safe-area-inset-bottom))' }}>
        <MPrimary onClick={onClose}>{applyLabel}</MPrimary>
      </div>
    </MSheet>
  )
}

/** Section de filtre : libellé gris 15 au-dessus, puces qui passent à la ligne. */
export function MFilterBloc({ titre, children }: { titre: string; children: ReactNode }) {
  return (
    <section style={{ marginBottom: 24 }}>
      <p style={{ margin: '0 4px 10px', fontFamily: FB, fontSize: 15, fontWeight: 600, color: 'var(--text-mid)' }}>{titre}</p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>{children}</div>
    </section>
  )
}

/** Curseur (range) confortable au doigt. */
export function MRange({ min, max, step, value, onChange, label }: { min: number; max: number; step: number; value: number; onChange: (v: number) => void; label: string }) {
  return (
    <input type="range" min={min} max={max} step={step} value={value} aria-label={label} onChange={e => onChange(+e.target.value)}
      style={{ width: '100%', height: 44, margin: 0, accentColor: 'var(--primary)', cursor: 'pointer' }} />
  )
}

/** Curseur de filtre : rendu bureau inchangé ; dans une MFilterSheet → MRange. */
export function FRange({ min, max, step, value, onChange, label }: { min: number; max: number; step: number; value: number; onChange: (v: number) => void; label?: string }) {
  const m = useInFilterSheet()
  if (m) return <MRange min={min} max={max} step={step} value={value} onChange={onChange} label={label ?? ''} />
  return <input type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(+e.target.value)} style={{ width: '100%', accentColor: 'var(--primary)' }} />
}
