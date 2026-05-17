'use client'
import { useState, useEffect } from 'react'

export interface ClockEvent {
  id: string
  date: string          // YYYY-MM-DD
  title: string
  color: string
  isGty: boolean
  categoryLabel: string // 'RACE' | 'PRO' | 'PERSO'
}

interface Props {
  events: ClockEvent[]
  year: number
}

const MONTHS_SHORT = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc']
const SIZE = 600
const CX   = SIZE / 2  // 300
const CY   = SIZE / 2  // 300
const R    = Math.round(SIZE * 0.42) // 252

function polar(angleDeg: number, radius: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180
  return { x: CX + radius * Math.cos(rad), y: CY + radius * Math.sin(rad) }
}

function dayOfYear(date: Date, year: number): number {
  return Math.floor((date.getTime() - new Date(year, 0, 1).getTime()) / 86_400_000)
}

export default function ClockView({ events, year }: Props) {
  const [now, setNow] = useState(() => new Date())
  const [tip, setTip] = useState<{ x: number; y: number; text: string } | null>(null)

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  const isCurrentYear = now.getFullYear() === year
  const handAngle = isCurrentYear ? (dayOfYear(now, year) / 365) * 360 : 0
  const handEnd   = polar(handAngle, R * 0.84)
  const handTip   = polar(handAngle, R * 0.90)

  // Build dots with collision resolution
  const rawDots = events
    .filter(e => parseInt(e.date.slice(0, 4), 10) === year)
    .map(e => {
      const d   = new Date(e.date + 'T12:00:00')
      const doy = dayOfYear(d, year)
      return { ...e, angle: (doy / 365) * 360 }
    })
    .sort((a, b) => a.angle - b.angle)

  const dots = rawDots.map((dot, i) => {
    const tooClose = rawDots.some((o, j) => j !== i && Math.abs(o.angle - dot.angle) < 3)
    const ringR = tooClose ? (i % 2 === 0 ? R - 15 : R + 15) : R
    return { ...dot, ringR }
  })

  const dayStr  = `${now.getDate()} ${now.toLocaleDateString('fr-FR', { month: 'long' }).replace(/^\w/, c => c.toUpperCase())}`
  const timeStr = now.toTimeString().slice(0, 8)

  return (
    <div id="clock-view" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
      <div style={{ width: '100%', maxWidth: 700, margin: '0 auto' }}>
        <svg viewBox={`0 0 ${SIZE} ${SIZE}`} style={{ width: '100%', height: 'auto', display: 'block' }}>

          {/* Ring */}
          <circle cx={CX} cy={CY} r={R} fill="none" stroke="var(--border)" strokeWidth={1} />

          {/* Month ticks + labels */}
          {MONTHS_SHORT.map((label, mi) => {
            const angle = (mi / 12) * 360
            const inner = polar(angle, R - 8)
            const outer = polar(angle, R + 8)
            const lp    = polar(angle, R + 26)
            const accent = mi === 0
            return (
              <g key={mi}>
                <line x1={inner.x} y1={inner.y} x2={outer.x} y2={outer.y}
                  stroke={accent ? '#00c8e0' : 'var(--text-dim)'}
                  strokeWidth={accent ? 2 : 1} />
                <text x={lp.x} y={lp.y} textAnchor="middle" dominantBaseline="middle"
                  fontSize={10} fontFamily="DM Mono, monospace"
                  fill={accent ? '#00c8e0' : 'var(--text-dim)'}>
                  {label}
                </text>
              </g>
            )
          })}

          {/* Event dots */}
          {dots.map(dot => {
            const pos  = polar(dot.angle, dot.ringR)
            const size = dot.isGty ? 6 : 4
            return (
              <circle key={dot.id} cx={pos.x} cy={pos.y} r={size}
                fill={dot.color} opacity={0.9}
                style={{
                  cursor: 'pointer',
                  filter: dot.isGty ? `drop-shadow(0 0 6px ${dot.color})` : undefined,
                }}
                onMouseEnter={e => {
                  const d = new Date(dot.date + 'T12:00:00')
                  setTip({
                    x: e.clientX, y: e.clientY,
                    text: [
                      dot.title,
                      d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }),
                      dot.categoryLabel,
                    ].join('\n'),
                  })
                }}
                onMouseLeave={() => setTip(null)}
              />
            )
          })}

          {/* Hand */}
          {isCurrentYear && <>
            <line x1={CX} y1={CY} x2={handEnd.x} y2={handEnd.y}
              stroke="#00c8e0" strokeWidth={1.5} strokeLinecap="round" />
            <circle cx={handTip.x} cy={handTip.y} r={3} fill="#00c8e0" />
          </>}

          {/* Center pivot */}
          <circle cx={CX} cy={CY} r={4} fill="#00c8e0" />

          {/* Center labels */}
          <text x={CX} y={CY - 22} textAnchor="middle"
            fontSize={28} fontWeight="bold" fontFamily="Syne, sans-serif" fill="var(--text)">
            {year}
          </text>
          <text x={CX} y={CY + 6} textAnchor="middle"
            fontSize={13} fontFamily="DM Mono, monospace" fill="var(--text-mid)">
            {dayStr}
          </text>
          {isCurrentYear && (
            <text x={CX} y={CY + 24} textAnchor="middle"
              fontSize={11} fontFamily="DM Mono, monospace" fill="var(--text-dim)">
              {timeStr}
            </text>
          )}
        </svg>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 20, fontSize: 11, color: 'var(--text-dim)' }}>
        {([['#ef4444','RACE'],['#3b82f6','PRO'],['#a855f7','PERSO']] as const).map(([c, l]) => (
          <span key={l} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: c, display: 'inline-block' }} />
            {l}
          </span>
        ))}
      </div>

      {/* Tooltip */}
      {tip && (
        <div style={{
          position: 'fixed', left: tip.x + 14, top: tip.y - 10, zIndex: 1000,
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: 8, padding: '8px 10px', fontSize: 11, color: 'var(--text)',
          pointerEvents: 'none', whiteSpace: 'pre-line', lineHeight: 1.6,
          boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
        }}>
          {tip.text}
        </div>
      )}

      <style>{`@media (max-width: 767px) { #clock-view { display: none !important; } }`}</style>
    </div>
  )
}
