'use client'
// ══════════════════════════════════════════════════════════════
// Kit MOBILE (≤ 767 px) des surpages IA — Routines, Studio, Réglages IA.
// Grammaire validée (maquettes « Strava / Claude ») : page gris clair
// (--surface-page), cartes blanches radius 20 (--surface-card), gros titres
// gras, listes groupées façon iOS séparées par un filet, boutons ronds
// flottants (--float-bg + --shadow-capsule). Tokens uniquement : clair/sombre
// gérés par globals.css. Cibles tactiles ≥ 44 px.
// ══════════════════════════════════════════════════════════════

import { useEffect, useState, type CSSProperties, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'motion/react'
import PressPop from '@/components/ui/PressPop'

/** Vrai sous 768 px (mobile). Lu dès le 1er rendu (arbres client uniquement :
 *  surpages montées en portail / chargées sans SSR) puis suit le media query. */
export function useIsMobile(query = '(max-width: 767px)'): boolean {
  const [m, setM] = useState(() => typeof window !== 'undefined' && window.matchMedia(query).matches)
  useEffect(() => {
    const mq = window.matchMedia(query)
    const f = () => setM(mq.matches)
    f(); mq.addEventListener('change', f)
    return () => mq.removeEventListener('change', f)
  }, [query])
  return m
}

export const FB = 'var(--font-body)'
export const PAGE_BG = 'var(--surface-page)'
export const CARD_BG = 'var(--surface-card)'
/** Filet séparateur des listes groupées. */
export const HAIRLINE = '1px solid var(--border)'
/** Ombre douce des cartes blanches (quasi invisible en sombre). */
export const SOFT_SHADOW = '0 1px 3px rgba(0,0,0,0.05)' // design-allow-color — ombre douce de carte
const SEG_SHADOW = '0 1px 3px rgba(0,0,0,0.10)' // design-allow-color — ombre du segment actif

// Teintes des tuiles d'icônes (réglages / studio) — palette fonctionnelle des
// maquettes validées, portée par une tuile à faible opacité (DESIGN_SYSTEM §2.1).
export const TILE = {
  cyan:   '#06B6D4', // design-allow-color — tuile d'icône (maquette validée)
  violet: '#A855F7', // design-allow-color — tuile d'icône (maquette validée)
  green:  '#22C55E', // design-allow-color — tuile d'icône (maquette validée)
  orange: '#F59E0B', // design-allow-color — tuile d'icône (maquette validée)
  red:    '#EF4444', // design-allow-color — tuile d'icône (maquette validée)
  indigo: '#6366F1', // design-allow-color — tuile d'icône (maquette validée)
  blue:   '#0EA5E9', // design-allow-color — tuile d'icône (maquette validée)
  grey:   'var(--text-mid)',
} as const

/** Couleur du point « modèle » (Hermès / Athéna / Zeus). */
export const MODEL_DOT: Record<'hermes' | 'athena' | 'zeus', string> = {
  hermes: '#22C55E', // design-allow-color — point sémantique modèle rapide
  athena: 'var(--primary)',
  zeus:   '#A855F7', // design-allow-color — point sémantique modèle max
}
export const MODEL_NAME: Record<'hermes' | 'athena' | 'zeus', string> = { hermes: 'Hermès', athena: 'Athéna', zeus: 'Zeus' }

/** Points de statut (ok / attention / erreur / neutre). */
export const STATUS_DOT = {
  ok:   'var(--success)',
  warn: '#F59E0B', // design-allow-color — point sémantique « en cours / attention »
  err:  'var(--danger)',
  idle: 'var(--text-dim)',
} as const

// ── Icônes (traits 2 px, 24×24) ─────────────────────────────────
export function Ico({ d, size = 20, sw = 2, fill = 'none' }: { d: ReactNode; size?: number; sw?: number; fill?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" aria-hidden style={{ flexShrink: 0, display: 'block' }}>
      {d}
    </svg>
  )
}
export const ICON = {
  back:    <path d="m15 18-6-6 6-6" />,
  plus:    <path d="M12 5v14M5 12h14" />,
  close:   <path d="M18 6 6 18M6 6l12 12" />,
  chev:    <path d="m9 18 6-6-6-6" />,
  play:    <path d="M7 4v16l13-8z" />,
  stop:    <rect x="6" y="6" width="12" height="12" rx="2" />,
  more:    <><circle cx="5" cy="12" r="1.4" /><circle cx="12" cy="12" r="1.4" /><circle cx="19" cy="12" r="1.4" /></>,
  bell:    <><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.9 1.9 0 0 0 3.4 0" /></>,
  grid:    <><rect x="3" y="3" width="7" height="7" rx="2" /><rect x="14" y="3" width="7" height="7" rx="2" /><rect x="3" y="14" width="7" height="7" rx="2" /><rect x="14" y="14" width="7" height="7" rx="2" /></>,
  clock:   <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  sliders: <path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6" />,
  star:    <path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z" />,
  mic:     <><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" /></>,
  users:   <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8" /></>,
  plug:    <path d="M12 22v-5M9 8V2M15 8V2M18 8v5a4 4 0 0 1-4 4h-4a4 4 0 0 1-4-4V8z" />,
  lock:    <><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></>,
  card:    <><rect x="2" y="5" width="20" height="14" rx="2" /><path d="M2 10h20" /></>,
  moon:    <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />,
  flag:    <path d="M4 22V4s1-1 4-1 5 2 8 2 4-1 4-1v11s-1 1-4 1-5-2-8-2-4 1-4 1" />,
  sun:     <><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></>,
  heart:   <path d="M19 14c1.5-1.5 3-3.2 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.8 0-3 .5-4.5 2-1.5-1.5-2.7-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4 3 5.5l7 7Z" />,
  activity:<path d="M22 12h-4l-3 9L9 3l-3 9H2" />,
  folder:  <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.7-.9L9.6 3.9A2 2 0 0 0 7.9 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z" />,
  copy:    <><rect x="9" y="9" width="12" height="12" rx="2" /><path d="M5 15V5a2 2 0 0 1 2-2h10" /></>,
  trash:   <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />,
  edit:    <><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" /></>,
  chat:    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />,
  bolt:    <path d="M13 2 3 14h9l-1 8 10-12h-9z" />,
  help:    <><circle cx="12" cy="12" r="10" /><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3M12 17h.01" /></>,
  user:    <><circle cx="12" cy="8" r="4" /><path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1" /></>,
  route:   <><circle cx="6" cy="19" r="3" /><path d="M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15" /><circle cx="18" cy="5" r="3" /></>,
}

// ── Bouton rond flottant (retour, +, ×, ▶) ───────────────────────
export const roundBtnStyle: CSSProperties = {
  width: 44, height: 44, borderRadius: '50%', border: 'none', cursor: 'pointer', flexShrink: 0,
  background: 'var(--float-bg)', color: 'var(--text)', boxShadow: 'var(--shadow-capsule)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0,
}
export function RoundBtn({ onClick, label, children, disabled }: { onClick: () => void; label: string; children: ReactNode; disabled?: boolean }) {
  return (
    <PressPop type="button" onClick={onClick} aria-label={label} title={label} disabled={disabled} popScale={1.12}
      style={{ ...roundBtnStyle, opacity: disabled ? 0.5 : 1 }}>
      {children}
    </PressPop>
  )
}

/** En-tête mobile : rond gauche · titre centré (+ sous-titre) · rond(s) droite. */
export function MobileHeader({ left, title, subtitle, right }: { left?: ReactNode; title: ReactNode; subtitle?: ReactNode; right?: ReactNode }) {
  return (
    <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 10, padding: 'max(12px, env(safe-area-inset-top)) 16px 10px', boxSizing: 'border-box', minHeight: 'calc(max(12px, env(safe-area-inset-top)) + 64px)' }}>
      <div style={{ minWidth: 44, display: 'flex', gap: 8 }}>{left}</div>
      <div style={{ flex: 1, minWidth: 0, textAlign: 'center' }}>
        <div style={{ fontSize: 19, fontWeight: 800, color: 'var(--text)', fontFamily: FB, letterSpacing: '-0.01em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</div>
        {subtitle && <div style={{ marginTop: 1, fontSize: 13, fontWeight: 700, fontFamily: FB, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>{subtitle}</div>}
      </div>
      <div style={{ minWidth: 44, display: 'flex', gap: 8, justifyContent: 'flex-end' }}>{right}</div>
    </div>
  )
}

/** Libellé de section (petites capitales grises). */
export function SectionLabel({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '22px 4px 10px' }}>
      <span style={{ flex: 1, fontSize: 12, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-dim)', fontFamily: FB }}>{children}</span>
      {right}
    </div>
  )
}

/** Carte blanche radius 20. */
export function MCard({ children, style, onClick }: { children: ReactNode; style?: CSSProperties; onClick?: () => void }) {
  const base: CSSProperties = { background: CARD_BG, borderRadius: 'var(--r-lg)', padding: 16, boxShadow: SOFT_SHADOW, fontFamily: FB, ...style }
  if (!onClick) return <div style={base}>{children}</div>
  return (
    <div role="button" tabIndex={0} onClick={onClick} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick() } }}
      style={{ ...base, cursor: 'pointer', transition: 'transform 0.15s ease' }}
      onPointerDown={e => { (e.currentTarget as HTMLDivElement).style.transform = 'scale(0.985)' }}
      onPointerUp={e => { (e.currentTarget as HTMLDivElement).style.transform = 'none' }}
      onPointerLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = 'none' }}>
      {children}
    </div>
  )
}

/** Tuile d'icône colorée (fond teinté à faible opacité). */
export function IconTile({ color, children, size = 40 }: { color: string; children: ReactNode; size?: number }) {
  return (
    <span style={{ width: size, height: size, borderRadius: 'var(--r-md)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color, background: `color-mix(in srgb, ${color} 14%, transparent)` }}>
      {children}
    </span>
  )
}

/** Tuile d'icône neutre (gris). */
export function NeutralTile({ children, size = 40 }: { children: ReactNode; size?: number }) {
  return (
    <span style={{ width: size, height: size, borderRadius: 'var(--r-md)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text)', background: 'var(--surface-chip)' }}>
      {children}
    </span>
  )
}

export function Dot({ color, size = 8 }: { color: string; size?: number }) {
  return <span aria-hidden style={{ width: size, height: size, borderRadius: '50%', background: color, flexShrink: 0, display: 'inline-block' }} />
}

export function Chevron({ size = 18 }: { size?: number }) {
  return <span style={{ color: 'var(--text-dim)', display: 'flex' }}><Ico d={ICON.chev} size={size} /></span>
}

/** Liste groupée (carte) — les lignes sont séparées par un filet. */
export function Group({ children, bg = CARD_BG }: { children: ReactNode; bg?: string }) {
  return <div style={{ background: bg, borderRadius: 'var(--r-lg)', overflow: 'hidden', fontFamily: FB }}>{children}</div>
}

/** Ligne de liste groupée : tuile · libellé (+ sous-titre) · valeur grise · chevron. */
export function GroupRow({ icon, label, sub, value, onClick, first, chevron = true, right, danger, disabled }: {
  icon?: ReactNode; label: ReactNode; sub?: ReactNode; value?: ReactNode; onClick?: () => void
  first?: boolean; chevron?: boolean; right?: ReactNode; danger?: boolean; disabled?: boolean
}) {
  const inner = (
    <>
      {icon}
      <span style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
        <span style={{ display: 'block', fontSize: 16, fontWeight: 600, color: danger ? 'var(--danger)' : disabled ? 'var(--text-dim)' : 'var(--text)', lineHeight: 1.25 }}>{label}</span>
        {sub && <span style={{ display: 'block', fontSize: 13, color: 'var(--text-mid)', marginTop: 2, lineHeight: 1.35 }}>{sub}</span>}
      </span>
      {value !== undefined && value !== null && value !== '' && (
        <span style={{ fontSize: 15, color: 'var(--text-mid)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '45%', display: 'flex', alignItems: 'center', gap: 6 }}>{value}</span>
      )}
      {right}
      {onClick && chevron && !disabled && <Chevron />}
    </>
  )
  const style: CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 12, width: '100%', minHeight: 56, padding: '10px 16px', boxSizing: 'border-box',
    border: 'none', borderTop: first ? 'none' : HAIRLINE, background: 'transparent', fontFamily: FB, color: 'var(--text)',
  }
  if (!onClick) return <div style={style}>{inner}</div>
  return (
    <button type="button" onClick={disabled ? undefined : onClick} disabled={disabled}
      style={{ ...style, cursor: disabled ? 'default' : 'pointer' }}>
      {inner}
    </button>
  )
}

/** Piste segmentée façon iOS (pilule active blanche). Défile si trop longue. */
export function SegTrack<T extends string>({ options, value, onChange, full = true }: {
  options: { v: T; l: ReactNode; locked?: boolean }[]; value: T; onChange: (v: T) => void; full?: boolean
}) {
  return (
    <div style={{ display: 'flex', gap: 2, padding: 3, borderRadius: 'var(--r-pill)', background: 'var(--surface-chip)', overflowX: 'auto', scrollbarWidth: 'none', width: full ? '100%' : undefined, boxSizing: 'border-box' }}>
      {options.map(o => {
        const on = o.v === value
        return (
          <button key={o.v} type="button" onClick={() => onChange(o.v)}
            style={{ flex: full ? '1 0 auto' : '0 0 auto', minHeight: 44, padding: '0 16px', borderRadius: 'var(--r-pill)', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap',
              background: on ? 'var(--surface-card)' : 'transparent', color: on ? 'var(--text)' : 'var(--text-mid)',
              boxShadow: on ? SEG_SHADOW : 'none',
              fontSize: 15, fontWeight: on ? 700 : 600, fontFamily: FB, opacity: o.locked ? 0.55 : 1,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, transition: 'background 0.2s ease, color 0.2s ease' }}>
            {o.l}
          </button>
        )
      })}
    </div>
  )
}

/** Puces d'onglets défilables (actif = pilule sombre). Cibles 44 px. */
export function ChipTabs<T extends string>({ options, value, onChange }: { options: { v: T; l: ReactNode }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div style={{ display: 'flex', gap: 8, overflowX: 'auto', scrollbarWidth: 'none', padding: '0 16px', flexShrink: 0 }}>
      {options.map(o => {
        const on = o.v === value
        return (
          <button key={o.v} type="button" onClick={() => onChange(o.v)} aria-pressed={on}
            style={{ flexShrink: 0, minHeight: 44, padding: '0 16px', borderRadius: 'var(--r-pill)', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap',
              background: on ? 'var(--text)' : 'var(--surface-chip)', color: on ? 'var(--bg)' : 'var(--text-mid)',
              fontSize: 15, fontWeight: 700, fontFamily: FB, transition: 'background 0.2s ease, color 0.2s ease' }}>
            {o.l}
          </button>
        )
      })}
    </div>
  )
}

/** Bouton pilule pleine largeur. variant: primary (cyan) | white (carte) | dark. */
export function PillButton({ children, onClick, variant = 'primary', disabled, style }: {
  children: ReactNode; onClick: () => void; variant?: 'primary' | 'white' | 'dark'; disabled?: boolean; style?: CSSProperties
}) {
  const v: CSSProperties = variant === 'primary'
    ? { background: 'var(--primary)', color: 'var(--on-primary)' }
    : variant === 'dark'
      ? { background: 'var(--text)', color: 'var(--bg)' }
      : { background: CARD_BG, color: 'var(--text)', boxShadow: SOFT_SHADOW }
  return (
    <button type="button" onClick={onClick} disabled={disabled}
      style={{ width: '100%', minHeight: 52, borderRadius: 'var(--r-pill)', border: 'none', cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.55 : 1,
        fontSize: 16, fontWeight: 700, fontFamily: FB, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, ...v, ...style }}>
      {children}
    </button>
  )
}

/** Carte « tuile » d'un carrousel horizontal (modèles, recommandés). */
export function HCard({ icon, title, sub, onClick, width = 168 }: { icon?: ReactNode; title: ReactNode; sub?: ReactNode; onClick: () => void; width?: number }) {
  return (
    <button type="button" onClick={onClick}
      style={{ flex: `0 0 ${width}px`, minHeight: 120, scrollSnapAlign: 'start', textAlign: 'left', border: 'none', cursor: 'pointer', borderRadius: 'var(--r-lg)', background: CARD_BG,
        padding: 14, display: 'flex', flexDirection: 'column', gap: 10, fontFamily: FB, boxShadow: SOFT_SHADOW }}>
      {icon}
      <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', lineHeight: 1.25, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{title}</span>
      {sub && <span style={{ fontSize: 13, color: 'var(--text-mid)', lineHeight: 1.35, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{sub}</span>}
    </button>
  )
}

/** Rangée horizontale défilable (déborde jusqu'aux bords de l'écran). */
export function HScroll({ children }: { children: ReactNode }) {
  return (
    <div style={{ display: 'flex', gap: 12, overflowX: 'auto', scrollbarWidth: 'none', scrollSnapType: 'x mandatory', margin: '0 -16px', padding: '2px 16px 6px', scrollPaddingLeft: 16 }}>
      {children}
    </div>
  )
}

/** Petit bouton texte d'en-tête de carte (« Modifier », « Journal »). */
export function TextLink({ children, onClick, color = 'var(--text-mid)' }: { children: ReactNode; onClick: () => void; color?: string }) {
  return (
    <button type="button" onClick={onClick}
      style={{ border: 'none', background: 'transparent', cursor: 'pointer', color, fontSize: 15, fontWeight: 600, fontFamily: FB, minHeight: 44, padding: '0 4px', marginTop: -12, marginRight: -4 }}>
      {children}
    </button>
  )
}

/** Feuille du bas (bottom sheet) : voile + panneau qui glisse, au-dessus des
 *  surpages (SlideOverlay = 18000). Poignée en haut ; le contenu gère son en-tête. */
export function MSheet({ open, onClose, children, zIndex = 18500, full = true, label }: {
  open: boolean; onClose: () => void; children: ReactNode; zIndex?: number; full?: boolean; label?: string
}) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])
  if (!mounted) return null
  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div key="scrim" onClick={onClose} aria-hidden
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}
          style={{ position: 'fixed', inset: 0, zIndex, background: 'var(--scrim)' }} />
      )}
      {open && (
        <motion.div key="panel" role="dialog" aria-modal="true" aria-label={label}
          initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
          style={{ position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: zIndex + 1, background: CARD_BG, borderRadius: 'var(--r-lg) var(--r-lg) 0 0',
            height: full ? 'calc(100dvh - max(48px, env(safe-area-inset-top)) - 8px)' : undefined, maxHeight: 'calc(100dvh - max(48px, env(safe-area-inset-top)) - 8px)',
            display: 'flex', flexDirection: 'column', boxShadow: 'var(--shadow-float)', fontFamily: FB, overflow: 'hidden' }}>
          <div aria-hidden style={{ display: 'flex', justifyContent: 'center', paddingTop: 8, flexShrink: 0 }}>
            <span style={{ width: 38, height: 5, borderRadius: 'var(--r-pill)', background: 'var(--surface-bar)' }} />
          </div>
          {children}
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}

/** En-tête de feuille : action gauche (texte) · titre · action droite (texte accent). */
export function SheetHeader({ leftLabel, onLeft, title, rightLabel, onRight, rightDisabled }: {
  leftLabel: string; onLeft: () => void; title: ReactNode; rightLabel?: string; onRight?: () => void; rightDisabled?: boolean
}) {
  const btn: CSSProperties = { border: 'none', background: 'transparent', cursor: 'pointer', minHeight: 44, padding: '0 4px', fontSize: 17, fontFamily: FB, whiteSpace: 'nowrap' }
  return (
    <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 8, padding: '4px 16px 8px' }}>
      <button type="button" onClick={onLeft} style={{ ...btn, color: 'var(--text-mid)', fontWeight: 600, minWidth: 72, textAlign: 'left' }}>{leftLabel}</button>
      <div style={{ flex: 1, minWidth: 0, textAlign: 'center', fontSize: 17, fontWeight: 800, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</div>
      <div style={{ minWidth: 72, display: 'flex', justifyContent: 'flex-end' }}>
        {rightLabel && onRight && (
          <button type="button" onClick={onRight} disabled={rightDisabled}
            style={{ ...btn, color: 'var(--primary)', fontWeight: 800, opacity: rightDisabled ? 0.5 : 1, cursor: rightDisabled ? 'default' : 'pointer' }}>{rightLabel}</button>
        )}
      </div>
    </div>
  )
}

/** Bloc de chargement (squelette — jamais de spinner). */
export function SkeletonCard({ height = 96 }: { height?: number }) {
  return <div aria-hidden style={{ height, borderRadius: 'var(--r-lg)', background: 'var(--surface-chip)', animation: 'aioPulse 1.4s ease-in-out infinite' }} />
}
export const SKELETON_CSS = '@keyframes aioPulse{0%,100%{opacity:.55}50%{opacity:1}}@media (prefers-reduced-motion: reduce){[style*="aioPulse"]{animation:none!important}}'
