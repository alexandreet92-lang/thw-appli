'use client'
// ══════════════════════════════════════════════════════════════
// Dashboard — primitives partagées : surface, titre, jauge animée,
// point sport, skeleton, état vide. Couleurs en var() uniquement
// (sport via sportColor, constante sanctionnée).
// ══════════════════════════════════════════════════════════════

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { FD, FB, NUM } from './lib'
import { usePushNav } from '@/hooks/usePushNav'

/** Respecte prefers-reduced-motion. */
export function useReducedMotion(): boolean {
  const [reduce, setReduce] = useState(false)
  useEffect(() => {
    const m = window.matchMedia('(prefers-reduced-motion: reduce)')
    const f = () => setReduce(m.matches)
    f()
    m.addEventListener('change', f)
    return () => m.removeEventListener('change', f)
  }, [])
  return reduce
}

/** Surface élevée, séparation par le fond et l'espace — jamais de bordure. */
export function Card({ children, elevated = true, href, style }: {
  children: React.ReactNode
  elevated?: boolean
  href?: string
  style?: React.CSSProperties
}) {
  const base: React.CSSProperties = {
    background: elevated ? 'var(--bg-card2)' : 'transparent',
    borderRadius: 'var(--r-lg)',
    padding: 'var(--space-5)',
    display: 'block',
    textDecoration: 'none',
    color: 'inherit',
    ...style,
  }
  if (href) {
    return <Link href={href} style={base} className="dash-tap">{children}</Link>
  }
  return <div style={base}>{children}</div>
}

export function SectionTitle({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 'var(--space-3)' }}>
      <h2 style={{ margin: 0, fontFamily: FD, fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>{children}</h2>
      {action}
    </div>
  )
}

/** Point sport 7px. */
export function SportDot({ color, size = 7 }: { color: string; size?: number }) {
  return <span aria-hidden style={{ width: size, height: size, borderRadius: '50%', background: color, flexShrink: 0, display: 'inline-block' }} />
}

/** Jauge modérée : remplissage 0 → valeur au montage. Accent cyan unique. */
export function Gauge({ value, max }: { value: number; max: number }) {
  const reduce = useReducedMotion()
  const [w, setW] = useState(0)
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0
  useEffect(() => {
    if (reduce) { setW(pct); return }
    const id = requestAnimationFrame(() => setW(pct))
    return () => cancelAnimationFrame(id)
  }, [pct, reduce])
  return (
    <div style={{ height: 6, borderRadius: 'var(--r-pill)', background: 'var(--bg-hover)', overflow: 'hidden' }}>
      <div style={{
        height: '100%', width: `${w}%`, borderRadius: 'var(--r-pill)', background: 'var(--primary)',
        transition: reduce ? 'none' : 'width 0.9s cubic-bezier(0.4,0,0.2,1)',
      }} />
    </div>
  )
}

export function Skeleton({ height = 96 }: { height?: number }) {
  return (
    <div style={{ height, borderRadius: 'var(--r-lg)', background: 'var(--bg-card2)' }} className="dash-skel" aria-hidden />
  )
}

/** Vide = invitation à agir (voix de l'interface). */
export function EmptyState({ title, hint, href, cta }: {
  title: string
  hint?: string
  href?: string
  cta?: string
}) {
  return (
    <div style={{ padding: 'var(--space-2) 0' }}>
      <p style={{ margin: 0, fontFamily: FB, fontSize: 17, fontWeight: 700, color: 'var(--text)' }}>{title}</p>
      {hint && <p style={{ margin: '6px 0 0', fontFamily: FB, fontSize: 14, color: 'var(--text-mid)', lineHeight: 1.5 }}>{hint}</p>}
      {href && cta && (
        <Link href={href} onClick={e => e.stopPropagation()} style={{ display: 'inline-block', marginTop: 'var(--space-3)', fontFamily: FB, fontSize: 15, fontWeight: 700, color: 'var(--primary)', textDecoration: 'none' }}>
          {cta} →
        </Link>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// Cartes façon Strava : en-tête (icône · titre · méta · ›), un gros chiffre,
// un petit visuel à droite. Toute la carte est tappable → la page détail
// arrive en glissant de la droite. Fond : --dash-card (blanc sur page grise
// en mobile clair), sinon --bg-card2.
// ══════════════════════════════════════════════════════════════

export function DashCard({ icon, title, meta, href, onOpen, children }: {
  icon: React.ReactNode
  title: string
  meta?: React.ReactNode
  href?: string
  /** Ouverture d'une vue détail interne (prioritaire sur href). */
  onOpen?: () => void
  children: React.ReactNode
}) {
  const push = usePushNav()
  const open = onOpen ?? (href ? () => push(href) : undefined)
  return (
    <div
      role={open ? 'link' : undefined}
      tabIndex={open ? 0 : undefined}
      onClick={open}
      onKeyDown={open ? e => { if (e.key === 'Enter') open() } : undefined}
      className={open ? 'dash-card dash-tap' : 'dash-card'}
      style={{ background: 'var(--dash-card, var(--bg-card2))', borderRadius: 'var(--r-lg)', padding: '18px 20px 20px', minWidth: 0, cursor: open ? 'pointer' : undefined }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, minWidth: 0 }}>
        <span aria-hidden style={{ display: 'flex', color: 'var(--primary)', flexShrink: 0 }}>{icon}</span>
        <h2 style={{ margin: 0, flex: 1, minWidth: 0, fontFamily: FB, fontSize: 17, fontWeight: 700, letterSpacing: '-0.01em', color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</h2>
        {meta && <span style={{ fontFamily: FB, fontSize: 14, color: 'var(--text-mid)', whiteSpace: 'nowrap', flexShrink: 0 }}>{meta}</span>}
        {open && (
          <svg aria-hidden width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-dim)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="m9 18 6-6-6-6" /></svg>
        )}
      </div>
      {children}
    </div>
  )
}

/** Libellé + gros chiffre (+ unité, pastille d'évolution) + ligne secondaire ; visuel à droite. */
export function Metric({ label, value, unit, chip, chipColor, sub, right }: {
  label?: string
  value: React.ReactNode
  unit?: string
  chip?: string
  chipColor?: string
  sub?: React.ReactNode
  right?: React.ReactNode
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, minWidth: 0 }}>
      <div style={{ minWidth: 0 }}>
        {label && <p style={{ margin: '0 0 4px', fontFamily: FB, fontSize: 15, color: 'var(--text-mid)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</p>}
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', columnGap: 8, rowGap: 4 }}>
          <span style={{ ...NUM, fontSize: 40, fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.05, whiteSpace: 'nowrap' }}>
            {value}{unit && <span style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-mid)', marginLeft: 4 }}>{unit}</span>}
          </span>
          {chip && <span style={{ ...NUM, display: 'inline-flex', alignItems: 'center', padding: '4px 8px', borderRadius: 'var(--r-sm)', background: 'var(--dash-chip, var(--bg-hover))', fontSize: 14, fontWeight: 600, color: chipColor ?? 'var(--text-mid)', whiteSpace: 'nowrap' }}>{chip}</span>}
        </div>
        {sub && <p style={{ margin: '8px 0 0', ...NUM, fontSize: 14, color: 'var(--text-mid)' }}>{sub}</p>}
      </div>
      {right && <div aria-hidden style={{ flexShrink: 0, display: 'flex' }}>{right}</div>}
    </div>
  )
}

/** Petites barres verticales (7 nuits, 7 jours…) ; la dernière / la courante en accent. */
export function MiniBars({ values, highlight, width = 96, height = 54 }: { values: number[]; highlight?: number; width?: number; height?: number }) {
  const max = Math.max(1, ...values)
  const n = values.length || 1
  const gap = 4
  const bw = (width - gap * (n - 1)) / n
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      {values.map((v, i) => {
        const h = v > 0 ? Math.max(4, (v / max) * height) : 4
        return <rect key={i} x={i * (bw + gap)} y={height - h} width={bw} height={h} rx={3}
          fill={i === highlight ? 'var(--primary)' : v > 0 ? 'var(--dash-bar, var(--border-mid))' : 'var(--bg-hover)'} />
      })}
    </svg>
  )
}

/** Anneau de progression (0 → 1). */
export function Ring({ value, color = 'var(--primary)', size = 64 }: { value: number; color?: string; size?: number }) {
  const r = size / 2 - 6
  const c = 2 * Math.PI * r
  const v = Math.min(1, Math.max(0, value))
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--bg-hover)" strokeWidth={7} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={7} strokeLinecap="round"
        strokeDasharray={c} strokeDashoffset={c * (1 - v)} transform={`rotate(-90 ${size / 2} ${size / 2})`} />
    </svg>
  )
}

/** Icônes d'en-tête (22 px, trait 2) — une par carte. */
const I = (d: string) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>
)
export const DASH_ICONS = {
  today: I('M3 6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM16 2v4M8 2v4M3 10h18'),
  forme: I('M22 12h-4l-3 9L9 3l-3 9H2'),
  sleep: I('M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9z'),
  week: I('M3 3v18h18M7 16v-4M12 16V8M17 16v-7'),
  load: I('m3 17 6-6 4 4 8-8M14 7h7v7'),
  next: I('M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01'),
  race: I('M4 22V4M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1'),
  last: I('M6.5 6.5h11M6.5 17.5h11M3 9v6M21 9v6M6.5 6.5v11M17.5 6.5v11'),
  nutrition: I('M12 6c-2-3-7-2-7 3 0 6 4 12 7 12s7-6 7-12c0-5-5-6-7-3zM12 6c0-2 1-3 3-4'),
  records: I('M6 9H4.5a2.5 2.5 0 0 1 0-5H6M18 9h1.5a2.5 2.5 0 0 0 0-5H18M4 22h16M10 14.7V17c0 .6-.5 1-1 1.2C7.9 18.8 7 20.2 7 22M14 14.7V17c0 .6.5 1 1 1.2 1.1.6 2 2 2 3.8M18 2H6v7a6 6 0 0 0 12 0V2z'),
}
