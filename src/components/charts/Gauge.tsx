'use client'
// Jauge radiale (arc 240°) — un score unique avec seuils de statut : readiness,
// TSB, risque 0-100, adhérence… Arc de fond gris, arc de valeur coloré par le
// statut, valeur héro au centre, bornes min/max. Bandes de seuil optionnelles.
import { INK, arcPath, polar } from './theme'

export interface GaugeBand { upTo: number; color: string }

export function Gauge({ value, min = 0, max = 100, size = 168, thickness = 16, color, label, unit, bands, invert = false, valueText }: {
  value: number
  min?: number
  max?: number
  size?: number
  thickness?: number
  color?: string          // couleur imposée (sinon dérivée des bands)
  label?: string
  unit?: string
  bands?: GaugeBand[]      // seuils croissants (ex. risque : [{upTo:33,green},{upTo:66,amber},{upTo:100,red}])
  invert?: boolean         // true : valeur basse = bon (ex. fatigue)
  valueText?: string       // texte héro imposé (sinon la valeur)
}) {
  const SPAN = 240, START = -SPAN / 2, END = SPAN / 2   // arc centré, ouvert en bas
  const cx = size / 2, cy = size / 2 + size * 0.06
  const r = (size - thickness) / 2 - 2
  const clamp = Math.max(min, Math.min(max, value))
  const frac = (clamp - min) / (max - min || 1)
  const valDeg = START + frac * SPAN

  const bandColor = () => {
    if (color) return color
    if (bands && bands.length) { for (const b of bands) if (value <= b.upTo) return b.color; return bands[bands.length - 1].color }
    return 'var(--primary)'
  }
  const c = bandColor()

  return (
    <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center' }}>
      <svg width={size} height={size * 0.82} viewBox={`0 0 ${size} ${size * 0.82}`}>
        {/* piste */}
        <path d={arcPath(cx, cy, r, START, END)} fill="none" stroke={INK.surface2} strokeWidth={thickness} strokeLinecap="round" />
        {/* bandes de seuil (fines, sous l'arc) */}
        {bands && bands.map((b, i) => {
          const lo = i === 0 ? min : bands[i - 1].upTo
          const s = START + ((lo - min) / (max - min || 1)) * SPAN
          const e = START + ((b.upTo - min) / (max - min || 1)) * SPAN
          return <path key={i} d={arcPath(cx, cy, r + thickness / 2 + 4, s, e)} fill="none" stroke={b.color} strokeWidth={3} strokeLinecap="round" opacity={0.5} />
        })}
        {/* valeur */}
        {frac > 0.001 && <path d={arcPath(cx, cy, r, START, valDeg)} fill="none" stroke={c} strokeWidth={thickness} strokeLinecap="round" style={{ transition: 'all .5s cubic-bezier(0.16,1,0.3,1)' }} />}
        {/* pointeur */}
        {(() => { const [px, py] = polar(cx, cy, r, valDeg); return <circle cx={px} cy={py} r={thickness / 2 - 1} fill={INK.surface} stroke={c} strokeWidth={3} /> })()}
        {/* héro */}
        <text x={cx} y={cy - size * 0.02} textAnchor="middle" style={{ fontFamily: 'Syne, sans-serif', fontSize: size * 0.24, fontWeight: 800, fill: c }}>
          {valueText ?? Math.round(value)}
        </text>
        {unit && <text x={cx} y={cy + size * 0.11} textAnchor="middle" style={{ fontSize: size * 0.075, fontWeight: 700, fill: INK.dim }}>{unit}</text>}
        {/* bornes */}
        {(() => { const [lx, ly] = polar(cx, cy, r, START); return <text x={lx} y={ly + 14} textAnchor="middle" style={{ fontSize: 9.5, fill: INK.dim }}>{invert ? max : min}</text> })()}
        {(() => { const [ex, ey] = polar(cx, cy, r, END); return <text x={ex} y={ey + 14} textAnchor="middle" style={{ fontSize: 9.5, fill: INK.dim }}>{invert ? min : max}</text> })()}
      </svg>
      {label && <span style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: INK.dim, marginTop: -2 }}>{label}</span>}
    </div>
  )
}
