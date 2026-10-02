'use client'
// ══════════════════════════════════════════════════════════════
// Kit des CARTES IA MOBILE (≤ 767 px) — maquettes validées « mock8 ».
// Carte blanche r=20 (--surface-card) qui apparaît en douceur (montée +
// fondu, ressort iOS), tuiles grises internes, tags teintés, pilules
// d'action (grise / cyan) avec retour tactile, barres segmentées animées
// (scaleX), chiffres qui « comptent » jusqu'à leur valeur.
// N'anime que transform / opacity. Respecte prefers-reduced-motion.
// Styles auto-injectés (<style href> dédupliqué) → utilisable hors AIPanel.
// ══════════════════════════════════════════════════════════════

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { motion, useReducedMotion, type Variants } from 'motion/react'
import { haptic } from '@/lib/haptics'

/** Courbe « ressort » iOS (sans rebond) partagée par toutes les cartes. */
export const AIM_EASE: [number, number, number, number] = [0.32, 0.72, 0, 1]
export const FB = 'var(--font-body)'

const CSS = `
.aimc { --aimc-grp: var(--surface-page); font-family: var(--font-body); color: var(--text); }
html.dark .aimc { --aimc-grp: var(--surface-chip); }
.aimc-card { background: var(--surface-card); border-radius: var(--r-lg); padding: 16px;
  box-shadow: 0 1px 3px color-mix(in srgb, var(--text) 6%, transparent); overflow: hidden; }
html.dark .aimc-card { box-shadow: none; }
.aimc-tile { background: var(--aimc-grp); border-radius: var(--r-md); padding: 10px; min-width: 0; }
.aimc-num { font-variant-numeric: tabular-nums; font-feature-settings: 'zero' 0; }
.aimc-press { -webkit-tap-highlight-color: transparent; touch-action: manipulation; }
.aimc-sep { height: 1px; background: var(--border); }
@keyframes aimc_grow { from { transform: scaleX(0); } to { transform: scaleX(1); } }
.aimc-grow { transform-origin: left center; animation: aimc_grow 0.9s cubic-bezier(0.32,0.72,0,1) both; }
@keyframes aimc_pulse { 0%,100% { opacity: .55 } 50% { opacity: 1 } }
.aimc-skel { background: var(--aimc-grp); border-radius: var(--r-md); animation: aimc_pulse 1.4s ease-in-out infinite; }
@media (prefers-reduced-motion: reduce) { .aimc-grow, .aimc-skel { animation: none; } }
`

/** Injecte les styles du kit (une seule fois grâce à href/precedence). */
export function AimCardStyles() {
  return <style href="aimc-kit" precedence="default">{CSS}</style>
}

// ── Carte (apparition en douceur) ───────────────────────────────
export function AimCard({ children, delay = 0, style, className, as = 'div' }: {
  children: ReactNode
  delay?: number
  style?: CSSProperties
  className?: string
  as?: 'div' | 'section'
}) {
  const reduce = useReducedMotion()
  const M = as === 'section' ? motion.section : motion.div
  return (
    <>
      <AimCardStyles />
      <M
        className={`aimc aimc-card${className ? ' ' + className : ''}`}
        initial={reduce ? false : { opacity: 0, y: 14, scale: 0.985 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: AIM_EASE, delay }}
        style={style}
      >
        {children}
      </M>
    </>
  )
}

// ── Liste décalée (stagger 50 ms) ───────────────────────────────
const staggerParent: Variants = { hidden: {}, show: { transition: { staggerChildren: 0.05, delayChildren: 0.04 } } }
const staggerChild: Variants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.42, ease: AIM_EASE } },
}
export function AimStagger({ children, style, className }: { children: ReactNode; style?: CSSProperties; className?: string }) {
  const reduce = useReducedMotion()
  return (
    <motion.div className={className} variants={staggerParent} initial={reduce ? false : 'hidden'} animate="show" style={style}>
      {children}
    </motion.div>
  )
}
export function AimStaggerItem({ children, style, className }: { children: ReactNode; style?: CSSProperties; className?: string }) {
  return <motion.div className={className} variants={staggerChild} style={style}>{children}</motion.div>
}

// ── Chiffre qui compte jusqu'à sa valeur ────────────────────────
export function useCountUp(target: number, duration = 900): number {
  const reduce = useReducedMotion()
  const [v, setV] = useState(reduce ? target : 0)
  const fromRef = useRef(0)
  useEffect(() => {
    if (reduce || !isFinite(target)) { setV(target); return }
    const from = fromRef.current
    const t0 = performance.now()
    let raf = 0
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / duration)
      const e = 1 - Math.pow(1 - p, 3)
      setV(from + (target - from) * e)
      if (p < 1) raf = requestAnimationFrame(tick)
      else fromRef.current = target
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, duration, reduce])
  return v
}

/**
 * Valeur affichée : si `text` contient UN nombre (ex. « 6 h/sem », « 24,2 »,
 * « -14 »), il est animé de 0 à sa valeur en gardant le format (décimales,
 * virgule) ; sinon le texte est rendu tel quel.
 */
export function CountText({ text }: { text: string }) {
  const m = text.match(/^(.*?)(-?\d+(?:[.,]\d+)?)(.*)$/)
  const target = m ? Number(m[2].replace(',', '.')) : NaN
  const decimals = m && /[.,](\d+)/.test(m[2]) ? (m[2].split(/[.,]/)[1]?.length ?? 0) : 0
  const comma = !!m && m[2].includes(',')
  const v = useCountUp(isFinite(target) ? target : 0)
  if (!m || !isFinite(target)) return <>{text}</>
  let s = v.toFixed(decimals)
  if (comma) s = s.replace('.', ',')
  return <>{m[1]}{s}{m[3]}</>
}

// ── Tuile statistique (libellé gris + valeur grasse) ────────────
export function AimStat({ label, value, sub, tone, size = 16 }: {
  label: string
  value: string
  sub?: string
  /** Couleur sémantique de la valeur (ex. TSB négatif). */
  tone?: string
  size?: number
}) {
  return (
    <div className="aimc-tile">
      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-mid)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</div>
      <div className="aimc-num" style={{ fontSize: size, fontWeight: 800, color: tone ?? 'var(--text)', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        <CountText text={value} />
      </div>
      {sub && <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 1, whiteSpace: 'nowrap' }}>{sub}</div>}
    </div>
  )
}

export function AimStatGrid({ children, cols = 4, style }: { children: ReactNode; cols?: number; style?: CSSProperties }) {
  return <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, gap: 6, ...style }}>{children}</div>
}

// ── Tag teinté (fond 14 % + texte plein) ────────────────────────
export function AimTag({ tint = 'var(--primary)', children, style }: { tint?: string; children: ReactNode; style?: CSSProperties }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 'var(--r-sm)',
      fontSize: 12, fontWeight: 800, whiteSpace: 'nowrap', lineHeight: 1.35,
      background: `color-mix(in srgb, ${tint} 14%, transparent)`, color: tint, ...style,
    }}>{children}</span>
  )
}

// ── Tuile d'icône teintée (30 px, r=10) ─────────────────────────
export function AimIconTile({ tint, children, size = 30 }: { tint: string; children: ReactNode; size?: number }) {
  return (
    <span aria-hidden style={{
      width: size, height: size, borderRadius: 'var(--r-sm)', flexShrink: 0, display: 'grid', placeItems: 'center',
      background: `color-mix(in srgb, ${tint} 15%, transparent)`, color: tint,
    }}>{children}</span>
  )
}

// ── Pilule d'action (grise / cyan) avec retour tactile ──────────
export function AimPill({ children, onClick, variant = 'grey', disabled = false, flex, type = 'button', hapticKind, style, ariaLabel }: {
  children: ReactNode
  onClick?: () => void
  variant?: 'grey' | 'primary' | 'ghost'
  disabled?: boolean
  flex?: number
  type?: 'button' | 'submit'
  /** Vibration au tap (actions clés). */
  hapticKind?: 'light' | 'medium' | 'success'
  style?: CSSProperties
  ariaLabel?: string
}) {
  const reduce = useReducedMotion()
  const v: CSSProperties = variant === 'primary'
    ? { background: disabled ? 'var(--surface-chip)' : 'var(--primary)', color: disabled ? 'var(--text-dim)' : 'var(--on-primary)' }
    : variant === 'ghost'
      ? { background: 'transparent', color: 'var(--text-mid)' }
      : { background: 'var(--surface-chip)', color: 'var(--text)' }
  return (
    <>
    <AimCardStyles />
    <motion.button
      type={type}
      aria-label={ariaLabel}
      className="aimc-press"
      disabled={disabled}
      onClick={() => { if (disabled) return; if (hapticKind) haptic(hapticKind); onClick?.() }}
      whileTap={disabled || reduce ? undefined : { scale: 0.97, opacity: 0.85 }}
      transition={{ duration: 0.18, ease: AIM_EASE }}
      style={{
        flex, minHeight: 48, padding: '0 16px', borderRadius: 'var(--r-pill)', border: 'none',
        fontFamily: FB, fontSize: 15, fontWeight: 700, cursor: disabled ? 'default' : 'pointer',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, whiteSpace: 'nowrap',
        transition: 'background 0.25s ease, color 0.25s ease', ...v, ...style,
      }}
    >
      {children}
    </motion.button>
    </>
  )
}

/** Bouton/ligne pressable générique (scale .97 + opacité). */
export function AimPress({ children, onClick, style, ariaLabel, disabled = false, className }: {
  children: ReactNode; onClick?: () => void; style?: CSSProperties; ariaLabel?: string; disabled?: boolean; className?: string
}) {
  const reduce = useReducedMotion()
  return (
    <>
    <AimCardStyles />
    <motion.button
      type="button"
      aria-label={ariaLabel}
      disabled={disabled}
      className={`aimc-press${className ? ' ' + className : ''}`}
      onClick={onClick}
      whileTap={disabled || reduce ? undefined : { scale: 0.97, opacity: 0.85 }}
      transition={{ duration: 0.18, ease: AIM_EASE }}
      style={{ border: 'none', background: 'transparent', padding: 0, textAlign: 'left', color: 'inherit', fontFamily: FB, cursor: disabled ? 'default' : 'pointer', ...style }}
    >
      {children}
    </motion.button>
    </>
  )
}

// ── Barre segmentée (zones / phases), remplissage animé ─────────
export function AimSegBar({ segments, height = 8, style }: {
  segments: { flex: number; color: string; key?: string }[]
  height?: number
  style?: CSSProperties
}) {
  const total = segments.reduce((a, s) => a + Math.max(0, s.flex), 0)
  if (total <= 0) return null
  return (
    <div style={{ height, borderRadius: 'var(--r-pill)', overflow: 'hidden', background: 'var(--surface-bar)', ...style }}>
      <div className="aimc-grow" style={{ display: 'flex', height: '100%', width: '100%' }}>
        {segments.filter(s => s.flex > 0).map((s, i) => (
          <i key={s.key ?? i} style={{ flex: s.flex, background: s.color, display: 'block' }} />
        ))}
      </div>
    </div>
  )
}

/** Libellé de section dans une carte (gris, gras, 13 px). */
export function AimLabel({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-mid)', ...style }}>{children}</div>
}

/** Ligne de liste (icône · titre/sous-titre · droite), séparée par un filet. */
export function AimListRow({ icon, title, sub, right, first = false, onClick }: {
  icon?: ReactNode; title: ReactNode; sub?: ReactNode; right?: ReactNode; first?: boolean; onClick?: () => void
}) {
  const inner = (
    <>
      {icon}
      <span style={{ flex: 1, minWidth: 0, display: 'block' }}>
        <span style={{ display: 'block', fontSize: 15, fontWeight: 700, color: 'var(--text)', lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</span>
        {sub && <span style={{ display: 'block', fontSize: 13, color: 'var(--text-mid)', marginTop: 2, lineHeight: 1.35, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sub}</span>}
      </span>
      {right}
    </>
  )
  const style: CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 12, width: '100%', minHeight: 56, padding: '11px 0',
    borderTop: first ? 'none' : '1px solid var(--border)', boxSizing: 'border-box',
  }
  if (!onClick) return <div style={style}>{inner}</div>
  return <AimPress onClick={onClick} style={style}>{inner}</AimPress>
}

/** Squelette (jamais de spinner). */
export function AimSkeleton({ height = 14, width = '100%', style }: { height?: number; width?: number | string; style?: CSSProperties }) {
  return <div aria-hidden className="aimc-skel" style={{ height, width, ...style }} />
}
