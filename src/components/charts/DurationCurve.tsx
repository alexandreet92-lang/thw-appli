'use client'
// Courbe durée-puissance (ou durée-allure) — meilleurs efforts par durée, axe X
// LOGARITHMIQUE (5 s → 1 h). Une série principale + comparaison optionnelle
// (ex. record all-time). Crosshair + valeur au survol.
import { useRef, useState } from 'react'
import { INK, LOAD, fmtDuration, niceMax } from './theme'

export interface CurvePoint { t: number; v: number }   // t = secondes, v = watts ou vitesse

export function DurationCurve({ series, compare, unit = 'W', height = 220, invertY = false }: {
  series: CurvePoint[]
  compare?: CurvePoint[]
  unit?: string
  height?: number
  invertY?: boolean   // allure : valeur basse = mieux → invertir l'axe
}) {
  const ref = useRef<SVGSVGElement | null>(null)
  const [hx, setHx] = useState<number | null>(null)
  const W = 720, padL = 40, padR = 14, padT = 12, padB = 26
  const pts = series.filter(p => p.t > 0 && p.v > 0).sort((a, b) => a.t - b.t)
  if (pts.length < 2) return <div style={{ fontSize: 12, color: INK.dim, padding: 16 }}>Pas assez de données.</div>

  const tMin = pts[0].t, tMax = pts[pts.length - 1].t
  const lx = (t: number) => padL + (Math.log(t / tMin) / Math.log(tMax / tMin)) * (W - padL - padR)
  const allV = [...pts, ...(compare ?? [])].map(p => p.v)
  const vMax = niceMax(Math.max(...allV))
  const vMin = invertY ? Math.min(...allV) * 0.9 : 0
  const y = (v: number) => padT + (1 - (v - vMin) / (vMax - vMin || 1)) * (height - padT - padB)
  const line = (ps: CurvePoint[]) => ps.map((p, i) => `${i ? 'L' : 'M'}${lx(p.t).toFixed(1)},${y(p.v).toFixed(1)}`).join(' ')
  const area = `M${lx(pts[0].t)},${height - padB} ` + pts.map(p => `L${lx(p.t).toFixed(1)},${y(p.v).toFixed(1)}`).join(' ') + ` L${lx(pts[pts.length - 1].t)},${height - padB} Z`

  const TICKS = [5, 15, 30, 60, 300, 600, 1200, 3600].filter(t => t >= tMin && t <= tMax)
  const yT = 4
  const onMove = (e: React.PointerEvent) => { const r = ref.current?.getBoundingClientRect(); if (!r) return; setHx((e.clientX - r.left) / r.width * W) }
  const near = hx == null ? null : pts.reduce((a, b) => Math.abs(lx(b.t) - hx!) < Math.abs(lx(a.t) - hx!) ? b : a)

  return (
    <svg ref={ref} viewBox={`0 0 ${W} ${height}`} width="100%" height={height} preserveAspectRatio="none"
      onPointerMove={onMove} onPointerLeave={() => setHx(null)} style={{ display: 'block', touchAction: 'none' }}>
      <defs><linearGradient id="dcF" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--primary)" stopOpacity="0.22" /><stop offset="100%" stopColor="var(--primary)" stopOpacity="0.02" /></linearGradient></defs>
      {Array.from({ length: yT + 1 }, (_, k) => { const v = vMin + ((vMax - vMin) / yT) * k; return <g key={k}><line x1={padL} y1={y(v)} x2={W - padR} y2={y(v)} stroke={INK.grid} strokeWidth={1} /><text x={padL - 5} y={y(v) + 3} textAnchor="end" style={{ fontSize: 9, fill: INK.dim }}>{Math.round(v)}</text></g> })}
      {compare && <path d={line(compare.filter(p => p.t > 0 && p.v > 0).sort((a, b) => a.t - b.t))} fill="none" stroke={INK.dim} strokeWidth={1.6} strokeDasharray="4 4" vectorEffect="non-scaling-stroke" />}
      <path d={area} fill="url(#dcF)" />
      <path d={line(pts)} fill="none" stroke="var(--primary)" strokeWidth={2.4} strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      {TICKS.map(t => <text key={t} x={lx(t)} y={height - 6} textAnchor="middle" style={{ fontSize: 9, fill: INK.dim }}>{fmtDuration(t)}</text>)}
      {near && hx != null && (
        <g pointerEvents="none">
          <line x1={lx(near.t)} y1={padT} x2={lx(near.t)} y2={height - padB} stroke={INK.text} strokeWidth={1} opacity={0.22} />
          <circle cx={lx(near.t)} cy={y(near.v)} r={4} fill="var(--primary)" stroke={INK.surface} strokeWidth={1.6} />
          <text x={lx(near.t)} y={y(near.v) - 9} textAnchor="middle" style={{ fontSize: 11, fontWeight: 800, fill: INK.text }}>{Math.round(near.v)} {unit} · {fmtDuration(near.t)}</text>
        </g>
      )}
    </svg>
  )
}
