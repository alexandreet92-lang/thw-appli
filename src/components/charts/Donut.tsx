'use client'
// Donut / anneau — répartition (zones, macros, compliance…). Segments avec
// écart de 2px, valeur héro au centre, légende directe (identité jamais par la
// couleur seule), survol qui met un segment en avant.
import { useState } from 'react'
import { INK, seriesColor, arcPath, fmtNum, fmtPct } from './theme'

export interface DonutSlice { label: string; value: number; color?: string; sub?: string }

export function Donut({ slices, size = 168, thickness = 20, centerValue, centerLabel, unit, legend = true }: {
  slices: DonutSlice[]
  size?: number
  thickness?: number
  centerValue?: string
  centerLabel?: string
  unit?: string
  legend?: boolean
}) {
  const [hi, setHi] = useState<number | null>(null)
  const total = slices.reduce((s, x) => s + Math.max(0, x.value), 0)
  const r = (size - thickness) / 2
  const cx = size / 2, cy = size / 2
  const GAP = total > 0 ? 2.2 : 0   // écart angulaire (deg) entre segments

  let acc = 0
  const segs = slices.map((s, i) => {
    const frac = total > 0 ? Math.max(0, s.value) / total : 0
    const start = acc * 360 + GAP / 2
    const end = (acc + frac) * 360 - GAP / 2
    acc += frac
    return { ...s, i, start: end > start ? start : start, end: Math.max(start, end), color: s.color ?? seriesColor(i), frac }
  })

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ flexShrink: 0 }}>
        {/* piste */}
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={INK.surface2} strokeWidth={thickness} />
        {segs.map(s => s.end > s.start && (
          <path key={s.i} d={arcPath(cx, cy, r, s.start, s.end)} fill="none" stroke={s.color}
            strokeWidth={hi === s.i ? thickness + 4 : thickness} strokeLinecap="round"
            opacity={hi == null || hi === s.i ? 1 : 0.35}
            style={{ transition: 'stroke-width .15s, opacity .15s', cursor: 'pointer' }}
            onMouseEnter={() => setHi(s.i)} onMouseLeave={() => setHi(null)}>
            <title>{`${s.label} · ${fmtNum(s.value)}${unit ? ' ' + unit : ''} (${fmtPct(s.frac * 100)})`}</title>
          </path>
        ))}
        {/* centre */}
        {(centerValue != null || hi != null) && (
          <>
            <text x={cx} y={cy - 2} textAnchor="middle" style={{ fontFamily: 'Syne, sans-serif', fontSize: size * 0.19, fontWeight: 800, fill: INK.text }}>
              {hi != null ? fmtNum(segs[hi].value) : centerValue}
            </text>
            <text x={cx} y={cy + size * 0.13} textAnchor="middle" style={{ fontFamily: 'DM Sans, sans-serif', fontSize: size * 0.075, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', fill: INK.dim }}>
              {hi != null ? segs[hi].label : centerLabel}
            </text>
          </>
        )}
      </svg>

      {legend && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7, minWidth: 120 }}>
          {segs.map(s => (
            <div key={s.i} onMouseEnter={() => setHi(s.i)} onMouseLeave={() => setHi(null)}
              style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'default', opacity: hi == null || hi === s.i ? 1 : 0.5, transition: 'opacity .15s' }}>
              <span style={{ width: 10, height: 10, borderRadius: 3, background: s.color, flexShrink: 0 }} />
              <span style={{ flex: 1, fontSize: 12.5, fontWeight: 600, color: INK.text, whiteSpace: 'nowrap' }}>{s.label}</span>
              <span className="tabular-nums" style={{ fontSize: 12.5, fontWeight: 700, color: INK.text }}>{fmtNum(s.value)}{unit ? ` ${unit}` : ''}</span>
              <span className="tabular-nums" style={{ fontSize: 11, color: INK.dim, width: 38, textAlign: 'right' }}>{fmtPct(s.frac * 100)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
