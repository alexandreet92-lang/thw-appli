'use client'
// ══════════════════════════════════════════════════════════════
// PMC compact (Modèle Datas) — CTL/ATL/TSB ~4 semaines, SVG brut.
// Série via buildPmc partagé (pas de recalcul). Tap → /activities
// (page Training, PMC complet). Tracé animé, reduced-motion respecté.
// ══════════════════════════════════════════════════════════════

import { useEffect, useMemo, useRef } from 'react'
import { buildPmc, LOAD_COLORS, type ActivityRow, type PmcPoint } from '@/lib/training/pmc'
import { Card, SectionTitle, Skeleton, EmptyState, useReducedMotion } from './primitives'
import { FB } from './lib'

const W = 320, H = 96

function path(pts: PmcPoint[], key: 'ctl' | 'atl' | 'tsb', min: number, max: number): string {
  if (pts.length < 2) return ''
  const range = max - min || 1
  return pts.map((p, i) => {
    const x = (i / (pts.length - 1)) * W
    const y = H - ((p[key] - min) / range) * H
    return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`
  }).join(' ')
}

const LEGEND: { key: 'ctl' | 'atl' | 'tsb'; label: string; color: string }[] = [
  { key: 'ctl', label: 'CTL', color: LOAD_COLORS.ctl },
  { key: 'atl', label: 'ATL', color: LOAD_COLORS.atl },
  { key: 'tsb', label: 'TSB', color: LOAD_COLORS.tsbPos },
]

export function PmcChart({ activities, loading }: { activities: ActivityRow[]; loading: boolean }) {
  const reduce = useReducedMotion()
  const ref = useRef<SVGGElement>(null)
  const pts = useMemo(() => (loading ? [] : buildPmc(activities, 28)), [activities, loading])

  const { min, max, zero } = useMemo(() => {
    const vals = pts.flatMap(p => [p.ctl, p.atl, p.tsb])
    const mn = Math.min(...vals, -10), mx = Math.max(...vals, 10)
    return { min: mn, max: mx, zero: H - ((0 - mn) / ((mx - mn) || 1)) * H }
  }, [pts])

  useEffect(() => {
    const g = ref.current
    if (!g || reduce) return
    const paths = Array.from(g.querySelectorAll('path'))
    paths.forEach(p => {
      const len = (p as SVGPathElement).getTotalLength()
      p.style.transition = 'none'
      p.style.strokeDasharray = String(len)
      p.style.strokeDashoffset = String(len)
      void p.getBoundingClientRect()
      p.style.transition = 'stroke-dashoffset 1.1s ease-out'
      p.style.strokeDashoffset = '0'
    })
  }, [pts, reduce])

  if (loading) return <Skeleton height={150} />

  return (
    <Card href="/activities">
      <SectionTitle action={<span style={{ fontFamily: FB, fontSize: 12, color: 'var(--text-dim)' }}>→</span>}>Charge · 4 semaines</SectionTitle>

      {pts.length < 2 ? (
        <EmptyState title="Pas assez de données" hint="Le PMC se dessine avec l'historique d'entraînement." />
      ) : (
        <>
          <div style={{ display: 'flex', gap: 'var(--space-4)', marginBottom: 'var(--space-2)' }}>
            {LEGEND.map(l => (
              <span key={l.key} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontFamily: FB, fontSize: 11, color: 'var(--text-mid)' }}>
                <span aria-hidden style={{ width: 14, height: 2, background: l.color, borderRadius: 1 }} />{l.label}
              </span>
            ))}
          </div>
          <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
            <line x1={0} y1={zero} x2={W} y2={zero} stroke="var(--border)" strokeDasharray="4 4" strokeWidth={1} />
            <g ref={ref}>
              <path d={path(pts, 'ctl', min, max)} fill="none" stroke={LOAD_COLORS.ctl} strokeWidth={2} strokeLinecap="round" />
              <path d={path(pts, 'atl', min, max)} fill="none" stroke={LOAD_COLORS.atl} strokeWidth={2} strokeLinecap="round" />
              <path d={path(pts, 'tsb', min, max)} fill="none" stroke={LOAD_COLORS.tsbPos} strokeWidth={1.5} strokeLinecap="round" />
            </g>
          </svg>
        </>
      )}
    </Card>
  )
}
