'use client'
import { useState } from 'react'
import { currentLocale } from '@/lib/i18n'

export type MacroEntry = {
  date: string
  label: string  // "Lun 14"
  p: number
  g: number
  l: number
}

const W = 520
const H = 190
const PAD_L = 38
const PAD_R = 12
const PAD_T = 12
const PAD_B = 32

export default function MacrosLineChart({
  entries,
  objP = 0,
  objG = 0,
  objL = 0,
}: {
  entries: MacroEntry[]
  objP?: number
  objG?: number
  objL?: number
}) {
  const [hover, setHover] = useState<number | null>(null)

  if (!entries.length) return null

  const n = entries.length
  const chartW = W - PAD_L - PAD_R
  const chartH = H - PAD_T - PAD_B
  const maxVal = Math.max(...entries.flatMap(e => [e.p, e.g, e.l]), objP, objG, objL, 1)

  function toX(i: number) { return PAD_L + (n === 1 ? chartW / 2 : (i / (n - 1)) * chartW) }
  function toY(v: number) { return PAD_T + chartH - (v / maxVal) * chartH }

  function buildPath(getV: (e: MacroEntry) => number): string {
    return entries
      .map((e, i) => `${i === 0 ? 'M' : 'L'}${toX(i).toFixed(1)},${toY(getV(e)).toFixed(1)}`)
      .join(' ')
  }

  const yTicks = [0, 0.5, 1].map(f => Math.round(maxVal * f))
  const step = Math.max(1, Math.floor(n / 6))
  const zoneW = n > 1 ? chartW / (n - 1) : chartW
  const hEntry = hover !== null ? entries[hover] : null

  return (
    <div style={{ position: 'relative' }}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        style={{ width: '100%', height: 'auto', display: 'block', overflow: 'visible' }}
        onMouseLeave={() => setHover(null)}
      >
        {/* Grid + Y labels */}
        {yTicks.map((v, i) => (
          <g key={i}>
            <line x1={PAD_L} y1={toY(v)} x2={W - PAD_R} y2={toY(v)}
              stroke="var(--border)" strokeWidth={0.5} strokeDasharray="3 3" />
            <text x={PAD_L - 4} y={toY(v) + 4} textAnchor="end"
              fill="var(--text-dim)" fontSize={8} fontFamily="DM Mono,monospace">
              {v > 0 ? v : ''}
            </text>
          </g>
        ))}

        {/* Objective reference lines */}
        {objP > 0 && (
          <line x1={PAD_L} y1={toY(objP)} x2={W - PAD_R} y2={toY(objP)}
            stroke="#22C55E" strokeWidth={1} strokeDasharray="4 3" opacity={0.35} />
        )}
        {objG > 0 && (
          <line x1={PAD_L} y1={toY(objG)} x2={W - PAD_R} y2={toY(objG)}
            stroke="#EAB308" strokeWidth={1} strokeDasharray="4 3" opacity={0.35} />
        )}
        {objL > 0 && (
          <line x1={PAD_L} y1={toY(objL)} x2={W - PAD_R} y2={toY(objL)}
            stroke="#F97316" strokeWidth={1} strokeDasharray="4 3" opacity={0.35} />
        )}

        {/* Lines */}
        {entries.some(e => e.p > 0) && (
          <path d={buildPath(e => e.p)} fill="none" stroke="#22C55E" strokeWidth={2} strokeLinejoin="round" />
        )}
        {entries.some(e => e.g > 0) && (
          <path d={buildPath(e => e.g)} fill="none" stroke="#EAB308" strokeWidth={2} strokeLinejoin="round" />
        )}
        {entries.some(e => e.l > 0) && (
          <path d={buildPath(e => e.l)} fill="none" stroke="#F97316" strokeWidth={2} strokeLinejoin="round" />
        )}

        {/* Hover dots */}
        {hover !== null && (() => {
          const e = entries[hover]
          return (
            <>
              {e.p > 0 && <circle cx={toX(hover)} cy={toY(e.p)} r={4} fill="#22C55E" stroke="white" strokeWidth={2} />}
              {e.g > 0 && <circle cx={toX(hover)} cy={toY(e.g)} r={4} fill="#EAB308" stroke="white" strokeWidth={2} />}
              {e.l > 0 && <circle cx={toX(hover)} cy={toY(e.l)} r={4} fill="#F97316" stroke="white" strokeWidth={2} />}
            </>
          )
        })()}

        {/* X axis */}
        {entries.map((e, i) => {
          if (n > 10 && i % step !== 0 && i !== 0 && i !== n - 1) return null
          return (
            <g key={e.date}>
              <text x={toX(i)} y={H - 18} textAnchor="middle"
                fill="var(--text-dim)" fontSize={9} fontFamily="DM Sans,sans-serif">
                {e.label.split(' ')[0]}
              </text>
              <text x={toX(i)} y={H - 6} textAnchor="middle"
                fill="var(--text-dim)" fontSize={8} fontFamily="DM Mono,monospace">
                {e.label.split(' ')[1]}
              </text>
            </g>
          )
        })}

        {/* Hover zones */}
        {entries.map((_, i) => (
          <rect key={i}
            x={toX(i) - zoneW / 2} y={PAD_T}
            width={zoneW} height={chartH}
            fill="transparent"
            onMouseEnter={() => setHover(i)}
          />
        ))}
      </svg>

      {/* Tooltip */}
      {hEntry && (
        <div style={{
          position: 'absolute', top: 4, right: 4,
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: 8, padding: '7px 11px', fontSize: 11,
          boxShadow: '0 4px 16px rgba(0,0,0,0.18)', pointerEvents: 'none', zIndex: 10,
          whiteSpace: 'nowrap',
        }}>
          <div style={{ fontWeight: 700, color: 'var(--text)', marginBottom: 5 }}>
            {new Date(hEntry.date + 'T00:00:00').toLocaleDateString(currentLocale(), {
              weekday: 'short', day: '2-digit', month: '2-digit',
            })}
          </div>
          <div style={{ color: '#22C55E', marginBottom: 2 }}>Prot : {hEntry.p.toFixed(0)} g</div>
          <div style={{ color: '#EAB308', marginBottom: 2 }}>Gluc : {hEntry.g.toFixed(0)} g</div>
          <div style={{ color: '#F97316' }}>Lip : {hEntry.l.toFixed(0)} g</div>
        </div>
      )}

      {/* Legend */}
      <div style={{ display: 'flex', gap: 14, marginTop: 6, flexWrap: 'wrap' }}>
        {[
          { color: '#22C55E', label: 'Proteines' },
          { color: '#EAB308', label: 'Glucides' },
          { color: '#F97316', label: 'Lipides' },
        ].map(item => (
          <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: item.color }} />
            <span style={{ fontSize: 10, color: 'var(--text-dim)' }}>{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
