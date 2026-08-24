'use client'
// Tuile de stat — un chiffre héro + libellé, delta signé optionnel (coloré par
// direction), et sparkline optionnelle. Pour les KPI où un graphe serait de trop.
import { INK, STATUS } from './theme'

export function Sparkline({ values, color = 'var(--primary)', width = 84, height = 26, fill = true }: { values: number[]; color?: string; width?: number; height?: number; fill?: boolean }) {
  const pts = values.filter(v => Number.isFinite(v))
  if (pts.length < 2) return null
  const min = Math.min(...pts), max = Math.max(...pts), rng = max - min || 1
  const x = (i: number) => (i / (pts.length - 1)) * width
  const y = (v: number) => height - 2 - ((v - min) / rng) * (height - 4)
  const line = pts.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ')
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ display: 'block' }}>
      {fill && <path d={`${line} L${width},${height} L0,${height} Z`} fill={color} opacity={0.12} />}
      <path d={line} fill="none" stroke={color} strokeWidth={1.8} strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
    </svg>
  )
}

export function StatTile({ value, label, unit, delta, deltaGood = 'up', spark, sparkColor, accent }: {
  value: string | number
  label: string
  unit?: string
  delta?: number            // variation signée (ex. +12)
  deltaGood?: 'up' | 'down' // sens « positif » (up : monter = bon)
  spark?: number[]
  sparkColor?: string
  accent?: string
}) {
  const good = delta == null ? null : (deltaGood === 'up' ? delta >= 0 : delta <= 0)
  const dCol = good == null ? INK.dim : good ? STATUS.good : STATUS.critical
  return (
    <div style={{ background: INK.surface, border: `1px solid ${INK.grid}`, borderRadius: 16, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
        <p style={{ margin: 0, fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: INK.dim }}>{label}</p>
        {spark && <Sparkline values={spark} color={sparkColor ?? accent ?? 'var(--primary)'} />}
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
        <span className="tabular-nums" style={{ fontFamily: 'Syne, sans-serif', fontSize: 26, fontWeight: 800, color: accent ?? INK.text, lineHeight: 1 }}>{value}</span>
        {unit && <span style={{ fontSize: 12, fontWeight: 600, color: INK.dim }}>{unit}</span>}
        {delta != null && <span className="tabular-nums" style={{ marginLeft: 'auto', fontSize: 12, fontWeight: 800, color: dCol }}>{delta > 0 ? '▲' : delta < 0 ? '▼' : ''} {Math.abs(delta)}</span>}
      </div>
    </div>
  )
}
