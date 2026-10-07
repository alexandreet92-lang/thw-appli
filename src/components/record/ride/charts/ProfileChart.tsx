'use client'
// Profil de séance — SVG RAW (règle projet : zéro lib de chart). Barres cibles
// par bloc (couleur = zone de puissance, tokens --zone-1..7), bloc en cours
// surligné, ligne de repère FTP, tracé de puissance réelle superposé, curseur de
// progression (rond non déformé en overlay HTML). Sans plan (sortie libre) : on
// n'affiche que le tracé réel mis à l'échelle sur le temps écoulé.
import { useMemo } from 'react'
import { zoneIndex, ZONES } from '../zones'
import type { RidePlan, RideSample } from '../types'

interface Props { plan: RidePlan | null; samples: RideSample[]; ftp: number; t: number }

export default function ProfileChart({ plan, samples, ftp, t }: Props) {
  const W = 1000, H = 300
  const blocks = plan?.blocks ?? []
  const total = useMemo(() => {
    if (plan) return plan.totalS || 1
    return Math.max(1, samples.length)
  }, [plan, samples.length])

  const pmax = useMemo(() => {
    const maxTarget = blocks.reduce((m, b) => Math.max(m, b.targetW), 0)
    const maxTrace = samples.reduce((m, s) => Math.max(m, s.power ?? 0), 0)
    return Math.max(ftp * 1.4, maxTarget * 1.1, maxTrace * 1.05, 1)
  }, [blocks, samples, ftp])

  const curIdx = useMemo(() => blocks.findIndex(b => t >= b.t0 && t < b.t1), [blocks, t])
  const ftpY = ftp > 0 ? H - (ftp / pmax) * H : null
  const cursorPct = Math.max(0, Math.min(100, (t / total) * 100))

  // Tracé réel (puissance) — stroke non mis à l'échelle (crisp 2 px).
  const tracePts = useMemo(() => {
    const pts: string[] = []
    for (const s of samples) {
      if (s.power == null) continue
      pts.push(`${((s.t / total) * W).toFixed(1)},${(H - (s.power / pmax) * H).toFixed(1)}`)
    }
    return pts.length > 1 ? pts.join(' ') : ''
  }, [samples, total, pmax])

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <svg width="100%" height="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ display: 'block' }} aria-hidden>
        {blocks.map((b, i) => {
          const x0 = (b.t0 / total) * W
          const bw = Math.max(1.5, (b.t1 - b.t0) / total * W - 1.5)
          const bh = b.targetW > 0 ? (b.targetW / pmax) * H : H * 0.14
          const y = H - bh
          const token = ZONES[zoneIndex(b.targetW, ftp)].token
          const state = i === curIdx ? 'now' : (curIdx >= 0 && i < curIdx) ? 'done' : 'todo'
          return (
            <g key={i}>
              <rect x={x0} y={y} width={bw} height={bh} fill={token}
                opacity={state === 'now' ? 0.55 : state === 'done' ? 0.18 : 0.3} />
              <rect x={x0} y={y} width={bw} height={3} fill={token} opacity={state === 'todo' ? 0.7 : 1} />
            </g>
          )
        })}
        {ftpY != null && (
          <line x1={0} y1={ftpY} x2={W} y2={ftpY} stroke="var(--border-mid)" strokeWidth={1}
            strokeDasharray="6 7" vectorEffect="non-scaling-stroke" />
        )}
        {tracePts && (
          <polyline points={tracePts} fill="none" stroke="var(--ride-trace)" strokeWidth={2}
            strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        )}
      </svg>
      {/* Curseur de progression (HTML : rond non déformé) */}
      <div style={{ position: 'absolute', top: 0, bottom: 0, left: `${cursorPct}%`, width: 2, marginLeft: -1, background: 'var(--ride-power)', pointerEvents: 'none' }}>
        <span style={{ position: 'absolute', top: -3, left: -4, width: 10, height: 10, borderRadius: '50%', background: 'var(--ride-power)', boxShadow: '0 0 0 3px var(--primary-dim)' }} />
      </div>
    </div>
  )
}
