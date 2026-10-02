'use client'
// ══════════════════════════════════════════════════════════════════
// Kit MOBILE (≤ 767 px) de l'espace COACH — nouveau style premium
// (maquettes k1 tableau · k2 athlètes · k3 fiche · k4 messages) :
// page gris chaud (--surface-page, posée par app/coach/layout.tsx), cartes
// blanches sans bordure radius 20, Inter, gros chiffres gras, tags de
// statut colorés, avatars ronds à point de statut, listes groupées à filet,
// puces pilule, CTA pilule cyan, feuilles du bas à poignée.
//
// Mouvement (transform / opacity uniquement, prefers-reduced-motion respecté) :
// entrée en cascade des cartes, compression au toucher (.97), compteur animé
// des KPI, indicateur de segment qui glisse (layoutId), lignes glissables,
// feuilles à ressort (drag pour fermer).
// Tokens uniquement : clair / sombre gérés par globals.css.
// ══════════════════════════════════════════════════════════════════
import { useEffect, useId, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { AnimatePresence, animate, motion, useDragControls, useMotionValue, useReducedMotion, type DragControls, type PanInfo } from 'motion/react'
import { useI18n, currentLocale } from '@/lib/i18n'
import { FB, CARD_BG, SOFT_SHADOW, TILE, Ico, ICON, SKELETON_CSS } from '@/components/ai/mobile/MobileKit'
import type { Forme } from '@/lib/coach/roster'

export { useIsMobile, RoundBtn, Ico, ICON, IconTile, TILE, FB, CARD_BG, SOFT_SHADOW, Chevron } from '@/components/ai/mobile/MobileKit'

export const EASE = [0.22, 1, 0.36, 1] as const
export const SPRING = { type: 'spring', stiffness: 380, damping: 34, mass: 0.9 } as const
export const NUM: CSSProperties = { fontFamily: FB, fontVariantNumeric: 'tabular-nums', fontFeatureSettings: "'zero' 0" }

// ── Traduction avec repli (clé absente du dictionnaire → texte FR) ──
export function useTT() {
  const { t } = useI18n()
  return (key: string, fallback: string, vars?: Record<string, string | number>) => {
    const s = t(key, vars)
    if (s !== key) return s
    let f = fallback
    if (vars) for (const [k, v] of Object.entries(vars)) f = f.replace(`{${k}}`, String(v))
    return f
  }
}

// ── Couleurs sémantiques ──────────────────────────────────────────
export const STATUS_COLOR: Record<Forme, string> = {
  ok: 'var(--success)',
  warn: TILE.orange,
  injured: 'var(--danger)',
  inactive: 'var(--text-dim)',
}
/** Palette des pastilles d'avatar (initiales blanches) — tokens sport + violet tuile. */
const AVATAR_TONES = ['var(--sport-gym)', 'var(--sport-run)', 'var(--sport-bike)', 'var(--sport-swim)', TILE.violet, 'var(--sport-hyrox)', 'var(--danger)', 'var(--sport-rowing)']
export const toneFor = (s: string) => AVATAR_TONES[Math.abs([...(s || '?')].reduce((a, c) => a + c.charCodeAt(0), 0)) % AVATAR_TONES.length]
export const initialsOf = (n: string) => (n || '?').trim().split(/\s+/).map(w => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() || '?'

// ── Styles globaux du kit (press, pulse, réduit) ─────────────────
export const CM_CSS = `
.cm-press{transition:transform .22s cubic-bezier(.2,.8,.2,1),opacity .2s ease;-webkit-tap-highlight-color:transparent;touch-action:manipulation}
.cm-press:active{transform:scale(.97)}
.cm-press-row{transition:background-color .18s ease;-webkit-tap-highlight-color:transparent}
.cm-press-row:active{background-color:var(--surface-soft)}
.cm-scroll-x{scrollbar-width:none}.cm-scroll-x::-webkit-scrollbar{display:none}
.cm-input::placeholder{color:var(--text-dim)}
@media (prefers-reduced-motion: reduce){.cm-press,.cm-press:active{transition:none;transform:none}}
${SKELETON_CSS}`
export function CoachMobileStyles() { return <style>{CM_CSS}</style> }

/** Conteneur d'une page coach mobile (gouttières 16 px + styles du kit). */
export function MPage({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <div data-coach-mpage style={{ width: '100%', boxSizing: 'border-box', padding: '6px 16px 28px', fontFamily: FB, color: 'var(--text)', ...style }}>
      <CoachMobileStyles />
      {children}
    </div>
  )
}

/** Entrée en cascade (fondu + glissement 14 px). */
export function Rise({ i = 0, children, style, className }: { i?: number; children: ReactNode; style?: CSSProperties; className?: string }) {
  const reduce = useReducedMotion()
  return (
    <motion.div className={className} style={style}
      initial={reduce ? false : { opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.46, ease: EASE, delay: Math.min(i, 12) * 0.055 }}>
      {children}
    </motion.div>
  )
}

/** Compteur animé (0 → valeur, puis valeur précédente → nouvelle). */
export function CountUp({ value, decimals = 0, duration = 0.9 }: { value: number; decimals?: number; duration?: number }) {
  const reduce = useReducedMotion()
  const [v, setV] = useState(reduce ? value : 0)
  const prev = useRef(0)
  useEffect(() => {
    if (reduce) { setV(value); prev.current = value; return }
    const ctl = animate(prev.current, value, { duration, ease: EASE, onUpdate: x => setV(x) })
    prev.current = value
    return () => ctl.stop()
  }, [value, reduce, duration])
  let txt: string
  try { txt = v.toLocaleString(currentLocale(), { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) }
  catch { txt = v.toFixed(decimals) }
  return <>{txt}</>
}

// ── Titre de page ────────────────────────────────────────────────
export function MTitle({ title, sub, right }: { title: ReactNode; sub?: ReactNode; right?: ReactNode }) {
  return (
    <Rise style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '4px 0 16px' }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <h1 style={{ margin: 0, fontFamily: FB, fontSize: 30, fontWeight: 800, letterSpacing: '-0.025em', lineHeight: 1.1, color: 'var(--text)' }}>{title}</h1>
        {sub && <p style={{ margin: '6px 0 0', fontSize: 15, color: 'var(--text-mid)', lineHeight: 1.4 }}>{sub}</p>}
      </div>
      {right && <div style={{ display: 'flex', gap: 10, flexShrink: 0 }}>{right}</div>}
    </Rise>
  )
}

// ── Carte blanche + en-tête ──────────────────────────────────────
export function CCard({ children, style, pad = 16 }: { children: ReactNode; style?: CSSProperties; pad?: number }) {
  return <div style={{ background: CARD_BG, borderRadius: 'var(--r-lg)', boxShadow: SOFT_SHADOW, padding: pad, fontFamily: FB, ...style }}>{children}</div>
}
export function CardHead({ title, right, onRight, count }: { title: ReactNode; right?: ReactNode; onRight?: () => void; count?: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 0 12px', borderBottom: '1px solid var(--border)' }}>
      <h2 style={{ margin: 0, flex: 1, minWidth: 0, fontFamily: FB, fontSize: 19, fontWeight: 800, letterSpacing: '-0.015em', color: 'var(--text)' }}>{title}</h2>
      {count !== undefined && <span style={{ ...NUM, fontSize: 17, fontWeight: 700, color: 'var(--text-mid)' }}>{count}</span>}
      {right !== undefined && (onRight
        ? <button type="button" onClick={onRight} className="cm-press" style={{ border: 'none', background: 'transparent', padding: '0 2px', minHeight: 44, margin: '-12px -2px', cursor: 'pointer', fontFamily: FB, fontSize: 16, fontWeight: 700, color: 'var(--text-mid)' }}>{right}</button>
        : <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-mid)' }}>{right}</span>)}
    </div>
  )
}

// ── Avatar rond (initiales blanches sur pastille, ou photo) + point de statut ──
export function MAvatar({ name, url, size = 48, status, ring = CARD_BG }: { name: string; url?: string | null; size?: number; status?: Forme | null; ring?: string }) {
  const dot = Math.max(10, Math.round(size * 0.26))
  return (
    <span style={{ position: 'relative', width: size, height: size, flexShrink: 0, display: 'inline-flex' }}>
      <span style={{ width: size, height: size, borderRadius: '50%', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: url ? 'var(--surface-chip)' : toneFor(name), color: 'var(--on-primary)', fontFamily: FB, fontWeight: 800, fontSize: Math.round(size * 0.38), letterSpacing: '-0.01em' }}>
        {url
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          : initialsOf(name).slice(0, 1)}
      </span>
      {status && <span aria-hidden style={{ position: 'absolute', right: 0, bottom: 0, width: dot, height: dot, borderRadius: '50%', background: STATUS_COLOR[status], boxShadow: `0 0 0 2.5px ${ring}` }} />}
    </span>
  )
}

/** Tag de statut : pilule teintée à faible opacité + texte coloré. */
export function Tag({ color, children }: { color: string; children: ReactNode }) {
  return (
    <span style={{ flexShrink: 0, display: 'inline-flex', alignItems: 'center', height: 30, padding: '0 12px', borderRadius: 'var(--r-pill)', whiteSpace: 'nowrap',
      background: `color-mix(in srgb, ${color} 14%, transparent)`, color, fontFamily: FB, fontSize: 14, fontWeight: 700 }}>
      {children}
    </span>
  )
}

/** Pastille de non-lus (pilule cyan). */
export function UnreadPill({ n }: { n: number }) {
  if (n <= 0) return null
  return <span style={{ ...NUM, minWidth: 26, height: 24, padding: '0 8px', boxSizing: 'border-box', borderRadius: 'var(--r-pill)', background: 'var(--primary)', color: 'var(--on-primary)', fontSize: 13, fontWeight: 800, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>{n > 99 ? '99+' : n}</span>
}

// ── Lignes de liste groupée (filet encarté) ───────────────────────
const rowBase: CSSProperties = { position: 'relative', display: 'flex', alignItems: 'center', gap: 14, width: '100%', boxSizing: 'border-box', minHeight: 64, padding: '12px 0', textDecoration: 'none', color: 'inherit', fontFamily: FB, background: 'transparent', border: 'none', textAlign: 'left' }
function Rule() { return <span aria-hidden style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'var(--border)' }} /> }
export function RowLink({ href, first, children, style, onClick }: { href: string; first?: boolean; children: ReactNode; style?: CSSProperties; onClick?: () => void }) {
  return <Link href={href} onClick={onClick} className="cm-press" style={{ ...rowBase, ...style }}>{!first && <Rule />}{children}</Link>
}
export function RowButton({ onClick, first, children, style, label }: { onClick: () => void; first?: boolean; children: ReactNode; style?: CSSProperties; label?: string }) {
  return <button type="button" onClick={onClick} aria-label={label} className="cm-press" style={{ ...rowBase, cursor: 'pointer', ...style }}>{!first && <Rule />}{children}</button>
}
export function RowText({ title, sub, strong }: { title: ReactNode; sub?: ReactNode; strong?: boolean }) {
  return (
    <span style={{ flex: 1, minWidth: 0, display: 'block' }}>
      <span style={{ display: 'block', fontSize: 17, fontWeight: strong ? 800 : 700, color: 'var(--text)', lineHeight: 1.25, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', letterSpacing: '-0.01em' }}>{title}</span>
      {sub && <span style={{ display: 'block', fontSize: 15, color: 'var(--text-mid)', marginTop: 3, lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sub}</span>}
    </span>
  )
}

/** Ligne glissable : glisser vers la gauche révèle des actions (Message, Gérer…).
 *  `data-hswipe` → le geste ne déclenche jamais la sidebar coach du shell. */
export function SwipeRow({ children, actions, first }: { children: ReactNode; actions: { label: string; icon: ReactNode; onClick: () => void; tone?: 'primary' | 'neutral' | 'danger' }[]; first?: boolean }) {
  const reduce = useReducedMotion()
  const W = actions.length * 76
  const [open, setOpen] = useState(false)
  const x = useMotionValue(0)
  const dragged = useRef(false)
  const settle = (to: boolean) => { setOpen(to); animate(x, to ? -W : 0, SPRING) }
  const onEnd = (_: unknown, info: PanInfo) => {
    const cur = x.get()
    const to = info.velocity.x < -420 ? true : info.velocity.x > 420 ? false : cur < -W / 2.4
    settle(to)
    setTimeout(() => { dragged.current = false }, 60)
  }
  return (
    <div data-hswipe style={{ position: 'relative', overflow: 'hidden', margin: '0 -16px' }}>
      {!first && <span aria-hidden style={{ position: 'absolute', top: 0, left: 16, right: 16, height: 1, background: 'var(--border)', zIndex: 2 }} />}
      <div aria-hidden={!open} style={{ position: 'absolute', top: 0, bottom: 0, right: 0, width: W, display: 'flex' }}>
        {actions.map(a => (
          <button key={a.label} type="button" tabIndex={open ? 0 : -1} onClick={() => { settle(false); a.onClick() }} className="cm-press"
            style={{ flex: 1, border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, fontFamily: FB, fontSize: 12, fontWeight: 700,
              background: a.tone === 'primary' ? 'var(--primary)' : a.tone === 'danger' ? 'var(--danger)' : 'var(--surface-chip)',
              color: a.tone === 'neutral' || !a.tone ? 'var(--text)' : 'var(--on-primary)' }}>
            {a.icon}{a.label}
          </button>
        ))}
      </div>
      <motion.div drag={reduce ? false : 'x'} dragDirectionLock dragConstraints={{ left: -W, right: 0 }} dragElastic={{ left: 0.08, right: 0.02 }}
        onDragStart={() => { dragged.current = true }} onDragEnd={onEnd}
        onClickCapture={e => { if (dragged.current || open) { e.preventDefault(); e.stopPropagation(); if (open && !dragged.current) settle(false) } }}
        style={{ x, position: 'relative', zIndex: 1, background: CARD_BG, padding: '0 16px', touchAction: 'pan-y' }}>
        {children}
      </motion.div>
    </div>
  )
}

// ── Tuile KPI (libellé + gros chiffre animé) ─────────────────────
export function KpiTile({ label, value, tone, suffix, loading, onClick, i = 0 }: { label: string; value: number | null; tone?: string; suffix?: string; loading?: boolean; onClick?: () => void; i?: number }) {
  const inner = (
    <>
      <span style={{ display: 'block', fontSize: 15, fontWeight: 700, color: 'var(--text-mid)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</span>
      <span style={{ ...NUM, display: 'block', marginTop: 4, fontSize: 34, fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.05, color: tone ?? 'var(--text)', whiteSpace: 'nowrap' }}>
        {loading || value === null ? <span style={{ color: 'var(--text-dim)' }}>—</span> : <CountUp value={value} />}
        {suffix && !loading && value !== null && <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-mid)', marginLeft: 4, letterSpacing: 0 }}>{suffix}</span>}
      </span>
    </>
  )
  const style: CSSProperties = { display: 'block', width: '100%', textAlign: 'left', boxSizing: 'border-box', background: CARD_BG, borderRadius: 'var(--r-lg)', boxShadow: SOFT_SHADOW, padding: '14px 14px 16px', border: 'none', fontFamily: FB, minWidth: 0 }
  return (
    <Rise i={i} style={{ minWidth: 0 }}>
      {onClick ? <button type="button" onClick={onClick} className="cm-press" style={{ ...style, cursor: 'pointer' }}>{inner}</button> : <div style={style}>{inner}</div>}
    </Rise>
  )
}

// ── Champ de recherche pilule ───────────────────────────────────
export function SearchM({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 10, minHeight: 52, padding: '0 16px', boxSizing: 'border-box', background: CARD_BG, borderRadius: 'var(--r-lg)', boxShadow: SOFT_SHADOW, color: 'var(--text-dim)' }}>
      <Ico d={<><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></>} size={20} />
      <input className="cm-input" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} enterKeyHint="search"
        style={{ flex: 1, minWidth: 0, border: 'none', outline: 'none', background: 'transparent', color: 'var(--text)', fontFamily: FB, fontSize: 17, minHeight: 44 }} />
      {value && (
        <button type="button" onClick={() => onChange('')} aria-label="×" className="cm-press" style={{ width: 28, height: 28, borderRadius: '50%', border: 'none', background: 'var(--surface-chip)', color: 'var(--text-mid)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0 }}>
          <Ico d={ICON.close} size={14} sw={2.6} />
        </button>
      )}
    </label>
  )
}

// ── Puces de filtre (actif = pilule sombre qui glisse) ───────────
export function ChipsM<T extends string>({ options, value, onChange }: { options: { v: T; l: ReactNode; count?: number; dot?: string }[]; value: T; onChange: (v: T) => void }) {
  const id = useId()
  const reduce = useReducedMotion()
  return (
    <div className="cm-scroll-x" data-hswipe style={{ display: 'flex', gap: 8, overflowX: 'auto', margin: '0 -16px', padding: '2px 16px 4px' }}>
      {options.map(o => {
        const on = o.v === value
        return (
          <button key={o.v} type="button" onClick={() => onChange(o.v)} aria-pressed={on} className="cm-press"
            style={{ position: 'relative', flexShrink: 0, minHeight: 44, padding: '0 16px', borderRadius: 'var(--r-pill)', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap',
              background: 'var(--surface-chip)', color: on ? 'var(--bg)' : 'var(--text-mid)', fontFamily: FB, fontSize: 16, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 8, transition: 'color .22s ease' }}>
            {on && <motion.span layoutId={`chip-${id}`} transition={reduce ? { duration: 0 } : SPRING} style={{ position: 'absolute', inset: 0, borderRadius: 'var(--r-pill)', background: 'var(--text)' }} />}
            <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              {o.dot && <span aria-hidden style={{ width: 8, height: 8, borderRadius: '50%', background: o.dot }} />}
              {o.l}{o.count !== undefined && <span style={{ ...NUM, opacity: on ? 0.9 : 0.75 }}>· {o.count}</span>}
            </span>
          </button>
        )
      })}
    </div>
  )
}

// ── Segmenté iOS (pouce blanc qui glisse) ───────────────────────
export function SegM<T extends string>({ options, value, onChange }: { options: { v: T; l: ReactNode }[]; value: T; onChange: (v: T) => void }) {
  const id = useId()
  const reduce = useReducedMotion()
  return (
    <div role="tablist" className="cm-scroll-x" data-hswipe style={{ display: 'flex', gap: 2, padding: 4, borderRadius: 'var(--r-pill)', background: 'var(--surface-chip)', overflowX: 'auto' }}>
      {options.map(o => {
        const on = o.v === value
        return (
          <button key={o.v} role="tab" aria-selected={on} type="button" onClick={() => onChange(o.v)}
            style={{ position: 'relative', flex: '1 0 auto', minHeight: 44, padding: '0 14px', borderRadius: 'var(--r-pill)', border: 'none', background: 'transparent', cursor: 'pointer', whiteSpace: 'nowrap',
              color: on ? 'var(--text)' : 'var(--text-mid)', fontFamily: FB, fontSize: 16, fontWeight: on ? 800 : 700, transition: 'color .22s ease', WebkitTapHighlightColor: 'transparent' }}>
            {on && <motion.span layoutId={`seg-${id}`} transition={reduce ? { duration: 0 } : SPRING} style={{ position: 'absolute', inset: 0, borderRadius: 'var(--r-pill)', background: CARD_BG, boxShadow: '0 1px 3px rgba(0,0,0,0.10)' /* design-allow-color — ombre du pouce actif */ }} />}
            <span style={{ position: 'relative' }}>{o.l}</span>
          </button>
        )
      })}
    </div>
  )
}

/** Contenu d'onglet : glissement + fondu directionnel au changement. */
export function TabPanel({ k, dir = 1, children }: { k: string; dir?: number; children: ReactNode }) {
  const reduce = useReducedMotion()
  return (
    <AnimatePresence mode="wait" initial={false} custom={dir}>
      <motion.div key={k}
        initial={reduce ? { opacity: 0 } : { opacity: 0, x: 18 * dir }}
        animate={{ opacity: 1, x: 0 }}
        exit={reduce ? { opacity: 0 } : { opacity: 0, x: -14 * dir }}
        transition={{ duration: reduce ? 0.12 : 0.26, ease: EASE }}>
        {children}
      </motion.div>
    </AnimatePresence>
  )
}

// ── Boutons ─────────────────────────────────────────────────────
export function CTA({ children, onClick, variant = 'primary', disabled, style, type = 'button' }: { children: ReactNode; onClick?: () => void; variant?: 'primary' | 'white' | 'dark' | 'soft' | 'danger'; disabled?: boolean; style?: CSSProperties; type?: 'button' | 'submit' }) {
  const v: CSSProperties = variant === 'primary' ? { background: 'var(--primary)', color: 'var(--on-primary)' }
    : variant === 'dark' ? { background: 'var(--text)', color: 'var(--bg)' }
    : variant === 'soft' ? { background: 'var(--surface-chip)', color: 'var(--text)' }
    : variant === 'danger' ? { background: 'color-mix(in srgb, var(--danger) 12%, transparent)', color: 'var(--danger)' }
    : { background: CARD_BG, color: 'var(--text)', boxShadow: SOFT_SHADOW }
  return (
    <button type={type} onClick={onClick} disabled={disabled} className="cm-press"
      style={{ width: '100%', minHeight: 54, borderRadius: 'var(--r-pill)', border: 'none', cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.5 : 1,
        fontFamily: FB, fontSize: 17, fontWeight: 800, letterSpacing: '-0.01em', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '0 20px', ...v, ...style }}>
      {children}
    </button>
  )
}
/** Petit bouton pilule (36–44 px). */
export function MiniPill({ children, onClick, tone = 'soft', disabled }: { children: ReactNode; onClick: () => void; tone?: 'soft' | 'primary' | 'danger'; disabled?: boolean }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} className="cm-press"
      style={{ flexShrink: 0, minHeight: 40, padding: '0 16px', borderRadius: 'var(--r-pill)', border: 'none', cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.5 : 1,
        background: tone === 'primary' ? 'var(--primary)' : tone === 'danger' ? 'color-mix(in srgb, var(--danger) 12%, transparent)' : 'var(--surface-chip)',
        color: tone === 'primary' ? 'var(--on-primary)' : tone === 'danger' ? 'var(--danger)' : 'var(--text)', fontFamily: FB, fontSize: 15, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      {children}
    </button>
  )
}

// ── Mini-barres animées (charge de l'équipe) ─────────────────────
export function GrowBars({ values, highlight, height = 112, labels }: { values: number[]; highlight?: number; height?: number; labels?: string[] }) {
  const reduce = useReducedMotion()
  const max = Math.max(1, ...values)
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, height }}>
        {values.map((v, i) => {
          const h = Math.max(10, Math.round((v / max) * height))
          const on = i === highlight
          return (
            <motion.span key={i} aria-hidden
              initial={reduce ? false : { scaleY: 0, opacity: 0.4 }} animate={{ scaleY: 1, opacity: 1 }}
              transition={{ duration: 0.7, ease: EASE, delay: 0.15 + i * 0.06 }}
              style={{ flex: 1, height: h, borderRadius: 'var(--r-sm)', transformOrigin: 'bottom', background: on ? 'var(--primary)' : v > 0 ? 'var(--surface-bar)' : 'var(--surface-chip)' }} />
          )
        })}
      </div>
      {labels && (
        <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
          {labels.map((l, i) => <span key={i} style={{ flex: 1, textAlign: 'center', fontSize: 12, fontWeight: i === highlight ? 800 : 600, color: i === highlight ? 'var(--text)' : 'var(--text-dim)' }}>{l}</span>)}
        </div>
      )}
    </div>
  )
}

// ── États ────────────────────────────────────────────────────────
export function SkelRows({ n = 3, h = 64 }: { n?: number; h?: number }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingTop: 12 }}>
      {Array.from({ length: n }).map((_, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, height: h }}>
          <span style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--surface-chip)', animation: 'aioPulse 1.4s ease-in-out infinite' }} />
          <span style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span style={{ width: '46%', height: 14, borderRadius: 'var(--r-sm)', background: 'var(--surface-chip)', animation: 'aioPulse 1.4s ease-in-out infinite' }} />
            <span style={{ width: '72%', height: 12, borderRadius: 'var(--r-sm)', background: 'var(--surface-chip)', animation: 'aioPulse 1.4s ease-in-out infinite' }} />
          </span>
        </div>
      ))}
    </div>
  )
}
export function EmptyM({ icon, title, hint, action }: { icon?: ReactNode; title: ReactNode; hint?: ReactNode; action?: ReactNode }) {
  return (
    <div style={{ padding: '22px 6px 8px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
      {icon && <span style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--primary-dim)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{icon}</span>}
      <p style={{ margin: 0, fontSize: 17, fontWeight: 800, color: 'var(--text)' }}>{title}</p>
      {hint && <p style={{ margin: 0, fontSize: 15, color: 'var(--text-mid)', lineHeight: 1.45, maxWidth: 300 }}>{hint}</p>}
      {action && <div style={{ marginTop: 6, width: '100%' }}>{action}</div>}
    </div>
  )
}

// ── Feuille du bas à ressort (poignée + glisser pour fermer) ─────
export function SheetM({ open, onClose, title, children, footer, zIndex = 13000, height, bg = 'var(--surface-page)', label }: {
  open: boolean; onClose: () => void; title?: ReactNode; children: ReactNode; footer?: ReactNode; zIndex?: number; height?: string; bg?: string; label?: string
}) {
  const reduce = useReducedMotion()
  const controls = useDragControls()
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])
  if (!mounted) return null
  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div key="cm-scrim" aria-hidden onClick={onClose}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.24 }}
          style={{ position: 'fixed', inset: 0, zIndex, background: 'var(--scrim)' }} />
      )}
      {open && (
        <motion.div key="cm-sheet" role="dialog" aria-modal="true" aria-label={label}
          initial={reduce ? { opacity: 0 } : { y: '100%' }} animate={reduce ? { opacity: 1 } : { y: 0 }} exit={reduce ? { opacity: 0 } : { y: '100%' }}
          transition={reduce ? { duration: 0.15 } : { type: 'spring', stiffness: 340, damping: 36, mass: 0.9 }}
          drag={reduce ? false : 'y'} dragControls={controls} dragListener={false} dragConstraints={{ top: 0, bottom: 0 }} dragElastic={{ top: 0.04, bottom: 0.9 }}
          onDragEnd={(_, info) => { if (info.offset.y > 120 || info.velocity.y > 700) onClose() }}
          style={{ position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: zIndex + 1, background: bg, borderRadius: 'var(--r-lg) var(--r-lg) 0 0',
            height, maxHeight: 'calc(100dvh - max(48px, env(safe-area-inset-top)) - 8px)', display: 'flex', flexDirection: 'column', boxShadow: 'var(--shadow-float)', fontFamily: FB, overflow: 'hidden' }}>
          <SheetGrab controls={controls} />
          {title && <div style={{ flexShrink: 0, padding: '2px 20px 12px', fontSize: 20, fontWeight: 800, letterSpacing: '-0.015em', color: 'var(--text)', textAlign: 'center' }}>{title}</div>}
          <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', WebkitOverflowScrolling: 'touch' as CSSProperties['WebkitOverflowScrolling'], padding: '0 16px 16px' }}>
            {children}
          </div>
          {footer && <div style={{ flexShrink: 0, padding: '10px 16px calc(12px + env(safe-area-inset-bottom))' }}>{footer}</div>}
          {!footer && <div style={{ flexShrink: 0, height: 'env(safe-area-inset-bottom)' }} />}
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
/** Poignée : glisser vers le bas referme la feuille (ressort sinon). */
function SheetGrab({ controls }: { controls: DragControls }) {
  return (
    <div onPointerDown={e => controls.start(e)}
      style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 12px', flexShrink: 0, touchAction: 'none', cursor: 'grab' }}>
      <span style={{ width: 40, height: 5, borderRadius: 'var(--r-pill)', background: 'var(--surface-bar)' }} />
    </div>
  )
}

/** Carte groupée (liste) — fond carte, lignes séparées par un filet. */
export function GroupM({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return <div style={{ background: CARD_BG, borderRadius: 'var(--r-lg)', boxShadow: SOFT_SHADOW, padding: '0 16px', overflow: 'hidden', fontFamily: FB, ...style }}>{children}</div>
}
/** Libellé gris au-dessus d'une carte. */
export function Label({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '22px 4px 8px' }}>
      <span style={{ flex: 1, fontSize: 15, fontWeight: 600, color: 'var(--text-mid)' }}>{children}</span>
      {right}
    </div>
  )
}
