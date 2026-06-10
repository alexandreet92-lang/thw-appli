'use client'

// Courbe d'évolution SVG brut (8 dernières séances, chronologique).
import type { ProgSession } from '@/lib/progression/helpers'

export function EvolutionChart({ sessions, metric, color }: {
  sessions: ProgSession[]; metric: keyof ProgSession; color: string
}) {
  const pts = sessions.slice(0, 8).reverse()
    .map(s => ({ y: (s[metric] as number | null), d: s.started_at }))
    .filter((p): p is { y: number; d: string } => typeof p.y === 'number' && isFinite(p.y))
  if (pts.length < 2) return <div style={{ fontSize: 12, color: 'var(--text-dim)', padding: '16px 0' }}>Pas assez de données pour la tendance.</div>

  const W = 600, H = 150, padX = 12, padT = 14, padB = 20
  const ys = pts.map(p => p.y)
  const mn = Math.min(...ys), mx = Math.max(...ys), rg = (mx - mn) || 1
  const x = (i: number) => padX + (i / (pts.length - 1)) * (W - padX * 2)
  const y = (v: number) => padT + (1 - (v - mn) / rg) * (H - padT - padB)
  const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(p.y).toFixed(1)}`).join(' ')
  const area = `M${x(0)},${H - padB} ` + pts.map((p, i) => `L${x(i).toFixed(1)},${y(p.y).toFixed(1)}`).join(' ') + ` L${x(pts.length - 1)},${H - padB} Z`

  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ width: '100%', height: 150, display: 'block' }}>
      {[0.25, 0.5, 0.75].map(t => (
        <line key={t} x1={padX} x2={W - padX} y1={padT + t * (H - padT - padB)} y2={padT + t * (H - padT - padB)} stroke="var(--border)" strokeWidth="0.5" strokeDasharray="2 4" vectorEffect="non-scaling-stroke" />
      ))}
      <path d={area} fill={color} opacity={0.12} />
      <path d={line} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      {pts.map((p, i) => (
        <circle key={i} cx={x(i)} cy={y(p.y)} r={i === pts.length - 1 ? 3.5 : 2.5} fill={i === pts.length - 1 ? 'var(--bg-card)' : color} stroke={color} strokeWidth={i === pts.length - 1 ? 2 : 0} vectorEffect="non-scaling-stroke" />
      ))}
    </svg>
  )
}
