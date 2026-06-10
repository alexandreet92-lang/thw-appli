'use client'

// Graphe de composition : courbe lissée (--primary) sur mesures brutes (points
// discrets), ligne d'objectif neutre, défilement temporel (zoom = période).
// SVG brut. Tooltip de point via createPortal sur document.body. Scroll natif
// (mobile) + chevrons (desktop) ; aucun setState par frame.

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { smooth, type Pt } from './compositionData'

interface Props { pts: Pt[]; unit: string; goal: number | null; periodDays: number; isDesktop: boolean }

const H = 200, PADY = 18, PADX = 14
const FB = 'var(--font-body)'
const empty = (text: string) => (
  <div style={{ fontFamily: FB, fontSize: 13, color: 'var(--text-mid)', padding: 'var(--space-6) 0' }}>{text}</div>
)

interface Tip { log: Pt['log']; x: number; y: number }

export function WeightGraph({ pts, unit, goal, periodDays, isDesktop }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [vw, setVw] = useState(0)
  const [tip, setTip] = useState<Tip | null>(null)

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const ro = new ResizeObserver(() => setVw(el.clientWidth))
    ro.observe(el); setVw(el.clientWidth)
    return () => ro.disconnect()
  }, [])

  // Ouvre sur la période récente (extrême droite) à chaque (re)montage / zoom.
  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollLeft = el.scrollWidth
  }, [vw, periodDays, pts.length])

  if (!pts.length) return empty('Ajoute ta première mesure ci-dessous.')
  if (pts.length === 1) {
    return (
      <div>
        <svg width="100%" height={H} style={{ display: 'block' }}>
          <circle cx="50%" cy={H / 2} r={4} fill="var(--primary)" />
        </svg>
        {empty('Ajoute une 2ᵉ mesure pour voir ta tendance.')}
      </div>
    )
  }

  const first = pts[0].t, last = pts[pts.length - 1].t
  const spanDays = Math.max((last - first) / 86400000, 1)
  const pxPerDay = vw > 0 ? Math.max(vw / periodDays, 0.5) : 6
  const totalW = Math.max(vw || 320, PADX * 2 + spanDays * pxPerDay)
  const allV = pts.map(p => p.v).concat(goal != null ? [goal] : [])
  const minV = Math.min(...allV), range = (Math.max(...allV) - minV) || 1
  const x = (t: number) => PADX + ((t - first) / 86400000) * pxPerDay
  const y = (v: number) => PADY + (1 - (v - minV) / range) * (H - 2 * PADY)
  const sm = smooth(pts.map(p => p.v))
  const path = sm.map((v, i) => `${i ? 'L' : 'M'}${x(pts[i].t).toFixed(1)},${y(v).toFixed(1)}`).join(' ')

  const scrollBy = (dir: number) => scrollRef.current?.scrollBy({ left: dir * (vw * 0.6), behavior: 'smooth' })
  const chevron = (dir: number, d: string) => (
    <button onClick={() => scrollBy(dir)} aria-label={dir < 0 ? 'Reculer' : 'Avancer'}
      style={{ position: 'absolute', top: '50%', [dir < 0 ? 'left' : 'right']: 0, transform: 'translateY(-50%)', zIndex: 2,
        width: 28, height: 28, borderRadius: '50%', border: 'none', background: 'var(--bg-card2)', color: 'var(--text-mid)',
        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d={d} /></svg>
    </button>
  )

  return (
    <div style={{ position: 'relative' }}>
      {isDesktop && chevron(-1, 'M15 18l-6-6 6-6')}
      {isDesktop && chevron(1, 'M9 18l6-6-6-6')}
      <div ref={scrollRef} style={{ overflowX: 'auto', overflowY: 'hidden',
        paddingLeft: isDesktop ? 'var(--space-8)' : 'var(--space-1)', paddingRight: isDesktop ? 'var(--space-8)' : 'var(--space-1)' }}>
        <svg width={totalW} height={H} style={{ display: 'block' }}>
          {goal != null && (
            <line x1={0} y1={y(goal)} x2={totalW} y2={y(goal)} stroke="var(--text-dim)" strokeWidth={1} strokeDasharray="5 4" />
          )}
          <path d={path} fill="none" stroke="var(--primary)" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
          {pts.map((p, i) => (
            <circle key={i} cx={x(p.t)} cy={y(p.v)} r={3.5} fill="var(--text-mid)" opacity={0.55}
              style={{ cursor: 'pointer' }} onClick={e => setTip({ log: p.log, x: e.clientX, y: e.clientY })} />
          ))}
        </svg>
      </div>
      {tip && createPortal(<PointTip tip={tip} unit={unit} onClose={() => setTip(null)} />, document.body)}
    </div>
  )
}

function PointTip({ tip, unit, onClose }: { tip: Tip; unit: string; onClose: () => void }) {
  const l = tip.log
  const left = Math.min(Math.max(tip.x - 80, 8), (typeof window !== 'undefined' ? window.innerWidth : 360) - 168)
  const row = (k: string, v: string) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--space-4)' }}>
      <span style={{ color: 'var(--text-mid)' }}>{k}</span>
      <span className="tnum" style={{ color: 'var(--text)' }}>{v}</span>
    </div>
  )
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 3000 }}>
      <div onClick={e => e.stopPropagation()} style={{ position: 'fixed', left, top: Math.max(tip.y - 96, 8), width: 160,
        background: 'var(--bg-card)', borderRadius: 'var(--r-sm)', boxShadow: 'var(--shadow-card)', padding: 'var(--space-3)',
        fontFamily: FB, fontSize: 12, display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
        <div style={{ fontWeight: 600, color: 'var(--text)', marginBottom: 'var(--space-1)' }}>{l.measured_at.slice(0, 10)}</div>
        {l.weight_kg != null && row('Poids', `${l.weight_kg} kg`)}
        {l.fat_mass_percent != null && row('Masse grasse', `${l.fat_mass_percent} %`)}
        {l.muscle_mass_kg != null && row('Masse musc.', `${l.muscle_mass_kg} kg`)}
        {unit === '' && <div style={{ color: 'var(--text-dim)', fontSize: 11 }}>Calculé (taille requise)</div>}
      </div>
    </div>
  )
}
