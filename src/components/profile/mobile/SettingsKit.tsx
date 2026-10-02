'use client'
// ══════════════════════════════════════════════════════════════════
// Kit MOBILE des réglages « Mon Profil » (sur-page ProfileSheet) — façon
// réglages de l'app Claude iOS : page gris chaud (--surface-page), cartes
// blanches radius 20 sans bordure, libellés de section gris au-dessus,
// textes d'aide gris en dessous, lignes ≥ 52 px séparées par un filet
// encarté, en-tête rond retour · titre centré · rond ✓.
// Repose sur MobileKit (Réglages IA) pour rester cohérent. Tokens
// uniquement : clair / sombre gérés par globals.css. Inter seule.
// ══════════════════════════════════════════════════════════════════
import { createContext, useContext, type CSSProperties, type ReactNode } from 'react'
import PressPop from '@/components/ui/PressPop'
import { FB, PAGE_BG, CARD_BG, SOFT_SHADOW, RoundBtn, Ico, ICON, Chevron } from '@/components/ai/mobile/MobileKit'

export { FB, PAGE_BG, CARD_BG }

// ── Contexte : vrai dans la mise en page mobile de ProfileContent ─────
export interface ProfileMobileState {
  mobile: boolean
  /** Sous-page Profil : signale une modification non enregistrée (✓ actif). */
  setDirty?: (dirty: boolean) => void
  /** Sous-page Profil : appelé après un enregistrement réussi via ✓. */
  onSaved?: () => void
}
export const ProfileMobileCtx = createContext<ProfileMobileState>({ mobile: false })
export function useProfileMobile(): ProfileMobileState { return useContext(ProfileMobileCtx) }

// ── Styles partagés ───────────────────────────────────────────────
export const M_TITLE: CSSProperties = { display: 'block', fontSize: 17, fontWeight: 600, color: 'var(--text)', lineHeight: 1.3, margin: 0, fontFamily: FB }
export const M_SUB: CSSProperties = { display: 'block', fontSize: 15, color: 'var(--text-mid)', lineHeight: 1.4, margin: '3px 0 0', fontFamily: FB }
export const M_VALUE: CSSProperties = { fontSize: 17, color: 'var(--text-mid)', fontFamily: FB, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }
/** Champ intégré à une ligne (valeur à droite, sans cadre). */
export const M_FIELD: CSSProperties = {
  border: 'none', background: 'transparent', outline: 'none', padding: 0, minHeight: 44,
  fontSize: 17, color: 'var(--text)', fontFamily: FB, textAlign: 'right', minWidth: 0,
}

// ── Section : libellé gris au-dessus, aide grise en dessous ───────────
export function MSection({ label, helper, children, style }: { label?: ReactNode; helper?: ReactNode; children: ReactNode; style?: CSSProperties }) {
  return (
    <section style={{ marginBottom: 26, ...style }}>
      {label && <p style={{ fontSize: 15, fontWeight: 500, color: 'var(--text-mid)', margin: '0 16px 8px', fontFamily: FB }}>{label}</p>}
      {children}
      {helper && <MHelper>{helper}</MHelper>}
    </section>
  )
}

export function MHelper({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return <p style={{ fontSize: 14, color: 'var(--text-mid)', margin: '8px 16px 0', lineHeight: 1.45, fontFamily: FB, ...style }}>{children}</p>
}

/** Texte d'introduction d'une sous-page (gris, sous l'en-tête). */
export function MIntro({ children }: { children: ReactNode }) {
  return <p style={{ fontSize: 15, color: 'var(--text-mid)', margin: '0 16px 22px', lineHeight: 1.45, fontFamily: FB }}>{children}</p>
}

/** Carte blanche groupée (radius 20, pas de bordure). */
export function MGroup({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return <div style={{ background: CARD_BG, borderRadius: 'var(--r-lg)', overflow: 'hidden', boxShadow: SOFT_SHADOW, fontFamily: FB, ...style }}>{children}</div>
}

/** Ligne d'une carte groupée. Filet encarté (16 px) au-dessus sauf la première. */
export function MLine({ first, onClick, align = 'center', disabled, children, style, label }: {
  first?: boolean; onClick?: () => void; align?: 'center' | 'flex-start'; disabled?: boolean
  children: ReactNode; style?: CSSProperties; label?: string
}) {
  const base: CSSProperties = {
    position: 'relative', display: 'flex', alignItems: align, gap: 14, width: '100%', boxSizing: 'border-box',
    minHeight: 56, padding: '14px 16px', textAlign: 'left', fontFamily: FB, color: 'var(--text)', ...style,
  }
  const rule = first ? null : <span aria-hidden style={{ position: 'absolute', top: 0, left: 16, right: 16, height: 1, background: 'var(--border)' }} />
  if (!onClick) return <div style={base}>{rule}{children}</div>
  return (
    <button type="button" onClick={disabled ? undefined : onClick} disabled={disabled} aria-label={label}
      style={{ ...base, border: 'none', background: 'transparent', cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.55 : 1 }}>
      {rule}{children}
    </button>
  )
}

/** Titre gras 17 + description grise (lignes à interrupteur, choix…). */
export function MRowText({ title, sub, danger, subColor }: { title: ReactNode; sub?: ReactNode; danger?: boolean; subColor?: string }) {
  return (
    <span style={{ flex: 1, minWidth: 0, display: 'block' }}>
      <span style={{ ...M_TITLE, color: danger ? 'var(--danger)' : 'var(--text)' }}>{title}</span>
      {sub && <span style={{ ...M_SUB, color: subColor ?? 'var(--text-mid)' }}>{sub}</span>}
    </span>
  )
}

/** Icône monochrome d'une ligne (sans tuile). */
export function MIcon({ children, danger }: { children: ReactNode; danger?: boolean }) {
  return <span aria-hidden style={{ display: 'flex', flexShrink: 0, color: danger ? 'var(--danger)' : 'var(--text-mid)' }}>{children}</span>
}

/** Ligne de navigation : icône · libellé (+ sous-titre) · valeur grise · chevron. */
export function MNavRow({ first, icon, label, sub, value, onClick, danger, chevron = true, disabled }: {
  first?: boolean; icon?: ReactNode; label: ReactNode; sub?: ReactNode; value?: ReactNode; onClick: () => void
  danger?: boolean; chevron?: boolean; disabled?: boolean
}) {
  return (
    <MLine first={first} onClick={onClick} disabled={disabled}>
      {icon}
      <span style={{ flex: 1, minWidth: 0, display: 'block' }}>
        <span style={{ display: 'block', fontSize: 17, fontWeight: 500, color: danger ? 'var(--danger)' : 'var(--text)', lineHeight: 1.3 }}>{label}</span>
        {sub && <span style={{ ...M_SUB, fontSize: 14 }}>{sub}</span>}
      </span>
      {value !== undefined && value !== null && value !== '' && (
        <span style={{ ...M_VALUE, overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '45%' }}>{value}</span>
      )}
      {chevron && !danger && <Chevron />}
    </MLine>
  )
}

/** Ligne de choix exclusif : coche cyan à droite quand active. */
export function MCheckRow({ first, icon, title, sub, active, onClick, disabled }: {
  first?: boolean; icon?: ReactNode; title: ReactNode; sub?: ReactNode; active: boolean; onClick: () => void; disabled?: boolean
}) {
  return (
    <MLine first={first} onClick={onClick} disabled={disabled}>
      {icon}
      <MRowText title={title} sub={sub} />
      <span aria-hidden style={{ width: 24, display: 'flex', justifyContent: 'flex-end', flexShrink: 0, color: 'var(--primary)' }}>
        {active && <Ico d={<path d="M20 6 9 17l-5-5" />} size={22} sw={2.6} />}
      </span>
    </MLine>
  )
}

/** Ligne « label | valeur » façon Claude (Nom complet | Alex). */
export function MFieldRow({ first, label, children }: { first?: boolean; label: ReactNode; children: ReactNode }) {
  return (
    <MLine first={first} style={{ paddingTop: 6, paddingBottom: 6 }}>
      <span style={{ flexShrink: 0, minWidth: 112, fontSize: 17, color: 'var(--text-mid)' }}>{label}</span>
      <span style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>{children}</span>
    </MLine>
  )
}

/** Bouton texte compact (Connecter, Autoriser, Débloquer…), cible 44 px. */
export function MTextBtn({ children, onClick, color = 'var(--primary)', disabled, label }: {
  children: ReactNode; onClick: () => void; color?: string; disabled?: boolean; label?: string
}) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} aria-label={label}
      style={{ flexShrink: 0, minHeight: 44, minWidth: 44, padding: '0 6px', border: 'none', background: 'transparent', cursor: disabled ? 'default' : 'pointer',
        color, opacity: disabled ? 0.5 : 1, fontSize: 16, fontWeight: 600, fontFamily: FB, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
      {children}
    </button>
  )
}

/** Puce grise (presets d'instruction…). */
export function MChip({ children, onClick, on }: { children: ReactNode; onClick: () => void; on?: boolean }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={on}
      style={{ minHeight: 44, padding: '0 16px', borderRadius: 'var(--r-pill)', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap',
        background: on ? 'var(--text)' : CARD_BG, color: on ? 'var(--bg)' : 'var(--text)', boxShadow: SOFT_SHADOW,
        fontSize: 15, fontWeight: 600, fontFamily: FB }}>
      {children}
    </button>
  )
}

/** Avatar rond (photo ou initiale). */
export function MAvatar({ url, initial, size = 56, alt }: { url?: string | null; initial: string; size?: number; alt: string }) {
  return (
    <span style={{ width: size, height: size, borderRadius: '50%', flexShrink: 0, overflow: 'hidden', background: 'var(--surface-chip)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {url
        // eslint-disable-next-line @next/next/no-img-element
        ? <img src={url} alt={alt} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        : <span style={{ fontSize: Math.round(size * 0.4), fontWeight: 700, color: 'var(--text-mid)', fontFamily: FB }}>{initial}</span>}
    </span>
  )
}

/** Bouton rond ✓ façon Claude : gris tant que rien n'a changé, sombre sinon. */
export function SaveCheckBtn({ onClick, disabled, label }: { onClick: () => void; disabled: boolean; label: string }) {
  return (
    <PressPop type="button" onClick={onClick} disabled={disabled} aria-label={label} title={label} popScale={1.12}
      style={{ width: 44, height: 44, borderRadius: '50%', border: 'none', padding: 0, flexShrink: 0, cursor: disabled ? 'default' : 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'var(--shadow-capsule)',
        background: disabled ? 'var(--text-dim)' : 'var(--text)', color: 'var(--surface-card)', transition: 'background 0.2s ease' }}>
      <Ico d={<path d="M20 6 9 17l-5-5" />} size={22} sw={2.4} />
    </PressPop>
  )
}

/** En-tête collant : rond retour (ou vide) · titre centré · rond(s) à droite. */
export function MSettingsHeader({ title, onBack, backLabel, right }: { title: ReactNode; onBack?: () => void; backLabel: string; right?: ReactNode }) {
  return (
    <div style={{ position: 'sticky', top: 0, zIndex: 5, background: PAGE_BG, display: 'flex', alignItems: 'center', gap: 10, padding: '6px 16px 12px', fontFamily: FB }}>
      <div style={{ width: 44, flexShrink: 0 }}>
        {onBack && <RoundBtn label={backLabel} onClick={onBack}><Ico d={ICON.back} size={22} sw={2.2} /></RoundBtn>}
      </div>
      <div style={{ flex: 1, minWidth: 0, textAlign: 'center', fontSize: 19, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.01em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</div>
      <div style={{ width: 44, flexShrink: 0, display: 'flex', justifyContent: 'flex-end' }}>{right}</div>
    </div>
  )
}

/** Tuile d'icône de la liste racine (fond teinté faible opacité, comme les Réglages IA). */
export function MTile({ color, children }: { color: string; children: ReactNode }) {
  return (
    <span aria-hidden style={{ width: 36, height: 36, borderRadius: 'var(--r-sm)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color, background: `color-mix(in srgb, ${color} 14%, transparent)` }}>
      {children}
    </span>
  )
}
