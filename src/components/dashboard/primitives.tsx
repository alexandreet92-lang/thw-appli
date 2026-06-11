'use client'
// ══════════════════════════════════════════════════════════════
// Dashboard — primitives partagées : surface, titre, jauge animée,
// point sport, skeleton, état vide. Couleurs en var() uniquement
// (sport via sportColor, constante sanctionnée).
// ══════════════════════════════════════════════════════════════

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { FD, FB } from './lib'

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
    <div style={{ height: 6, borderRadius: 999, background: 'var(--bg-hover)', overflow: 'hidden' }}>
      <div style={{
        height: '100%', width: `${w}%`, borderRadius: 999, background: 'var(--primary)',
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
      <p style={{ margin: 0, fontFamily: FD, fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>{title}</p>
      {hint && <p style={{ margin: 'var(--space-1) 0 0', fontFamily: FB, fontSize: 13, color: 'var(--text-mid)', lineHeight: 1.5 }}>{hint}</p>}
      {href && cta && (
        <Link href={href} style={{ display: 'inline-block', marginTop: 'var(--space-3)', fontFamily: FB, fontSize: 13, fontWeight: 600, color: 'var(--primary)', textDecoration: 'none' }}>
          {cta} →
        </Link>
      )}
    </div>
  )
}
