'use client'
// Radar — profil multi-axes (0–100 par défaut). Une ou deux séries (ex. athlète
// vs référence, ou année N vs N-1). Anneaux de graduation discrets, axes
// étiquetés, remplissage translucide, points aux sommets.
import { INK, seriesColor, polar } from './theme'

export interface RadarSeries { label: string; values: number[]; color?: string }

export function Radar({ axes, series, size = 260, max = 100 }: {
  axes: string[]
  series: RadarSeries[]
  size?: number
  max?: number
}) {
  const cx = size / 2, cy = size / 2
  const r = size / 2 - 34
  const n = axes.length
  const rings = [0.25, 0.5, 0.75, 1]
  const ptFor = (vals: number[]) => vals.map((v, i) => polar(cx, cy, (Math.max(0, Math.min(max, v)) / max) * r, (i / n) * 360))
  const poly = (pts: [number, number][]) => pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ') + ' Z'

  return (
    <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* anneaux */}
        {rings.map((f, k) => (
          <polygon key={k} points={Array.from({ length: n }, (_, i) => polar(cx, cy, f * r, (i / n) * 360).join(',')).join(' ')}
            fill="none" stroke={INK.grid} strokeWidth={1} />
        ))}
        {/* rayons + labels */}
        {axes.map((ax, i) => {
          const [lx, ly] = polar(cx, cy, r, (i / n) * 360)
          const [tx, ty] = polar(cx, cy, r + 16, (i / n) * 360)
          return (
            <g key={i}>
              <line x1={cx} y1={cy} x2={lx} y2={ly} stroke={INK.grid} strokeWidth={1} />
              <text x={tx} y={ty + 3} textAnchor={Math.abs(tx - cx) < 6 ? 'middle' : tx > cx ? 'start' : 'end'} style={{ fontSize: 10, fontWeight: 600, fill: INK.mid }}>{ax}</text>
            </g>
          )
        })}
        {/* séries */}
        {series.map((s, si) => {
          const c = s.color ?? seriesColor(si)
          const pts = ptFor(s.values)
          return (
            <g key={si}>
              <path d={poly(pts)} fill={c} fillOpacity={si === 0 ? 0.16 : 0.08} stroke={c} strokeWidth={2} strokeLinejoin="round" />
              {pts.map((p, i) => <circle key={i} cx={p[0]} cy={p[1]} r={3} fill={c} stroke={INK.surface} strokeWidth={1.4}><title>{`${axes[i]} : ${Math.round(s.values[i])}`}</title></circle>)}
            </g>
          )
        })}
      </svg>
      {series.length > 1 && (
        <div style={{ display: 'flex', gap: 16 }}>
          {series.map((s, si) => (
            <span key={si} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11.5, fontWeight: 600, color: INK.mid }}>
              <span style={{ width: 10, height: 10, borderRadius: 3, background: s.color ?? seriesColor(si) }} />{s.label}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
