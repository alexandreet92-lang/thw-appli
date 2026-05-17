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
const SIZE = 620
const CX   = SIZE / 2
const CY   = SIZE / 2
const R    = Math.round(SIZE * 0.40) // 248 — outer ring
const ACCENT = '#00c8e0'

function polar(angleDeg: number, radius: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180
  return { x: CX + radius * Math.cos(rad), y: CY + radius * Math.sin(rad) }
}

function dayOfYear(date: Date, year: number): number {
  return Math.floor((date.getTime() - new Date(year, 0, 1).getTime()) / 86_400_000)
}

function arcPath(startAngle: number, endAngle: number, r: number): string {
  // Normalize so arc always goes forward (clockwise)
  let end = endAngle
  if (end <= startAngle) end += 360
  if (end - startAngle > 359) return '' // full circle — skip
  const large = (end - startAngle) > 180 ? 1 : 0
  const s = polar(startAngle, r)
  const e = polar(end, r)
  return `M ${s.x} ${s.y} A ${r} ${r} 0 ${large} 1 ${e.x} ${e.y}`
}

export default function ClockView({ events, year }: Props) {
  const [now, setNow] = useState(() => new Date())
  const [tip, setTip] = useState<{ x: number; y: number; text: string } | null>(null)
  const [hoverId, setHoverId] = useState<string | null>(null)

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  const currentMonth = now.getMonth()
  const isCurrentYear = now.getFullYear() === year

  // Hand angle
  const todayAngle = isCurrentYear ? (dayOfYear(now, year) / 365) * 360 : 0

  // Next GTY event angle
  const gtyEvents = events
    .filter(e => e.isGty && parseInt(e.date.slice(0, 4), 10) === year)
    .map(e => {
      const d = new Date(e.date + 'T12:00:00')
      return { ...e, angle: (dayOfYear(d, year) / 365) * 360 }
    })
    .filter(e => e.angle >= todayAngle)
    .sort((a, b) => a.angle - b.angle)
  const nextGty = gtyEvents[0] ?? null

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
    const tooClose = rawDots.some((o, j) => j !== i && Math.abs(o.angle - dot.angle) < 4)
    const dotR = R + 16 + (tooClose ? (i % 2 === 0 ? 0 : 20) : 0)
    return { ...dot, dotR }
  })

  // Formatted strings
  const dayStr  = `${now.getDate()} ${now.toLocaleDateString('fr-FR', { month: 'long' }).replace(/^\w/, c => c.toUpperCase())}`
  const timeStr = now.toTimeString().slice(0, 8)

  // Hand geometry
  const handAngle   = todayAngle
  const handTipPos  = polar(handAngle, R * 0.85)
  const handBasePos = polar(handAngle + 180, R * 0.15)

  return (
    <div id="clock-view" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24 }}>
      <div style={{ width: '100%', maxWidth: 680, margin: '0 auto' }}>
        <svg viewBox={`0 0 ${SIZE} ${SIZE}`} style={{ width: '100%', height: 'auto', display: 'block', overflow: 'visible' }}>

          {/* Background depth circles */}
          {[0.20, 0.40, 0.60].map((frac, i) => (
            <circle key={i} cx={CX} cy={CY} r={R * frac}
              fill="none" stroke="var(--text)" strokeWidth={0.5} opacity={0.06} />
          ))}

          {/* Inner ring */}
          <circle cx={CX} cy={CY} r={R - 18}
            fill="none" stroke="var(--text-dim)" strokeWidth={0.5} opacity={0.18} />

          {/* Outer ring */}
          <circle cx={CX} cy={CY} r={R}
            fill="none" stroke="var(--text-dim)" strokeWidth={1} opacity={0.30} />

          {/* Countdown arc today → next GTY */}
          {nextGty && isCurrentYear && (() => {
            const path = arcPath(todayAngle, nextGty.angle, R)
            return path ? (
              <path d={path} fill="none"
                stroke={ACCENT} strokeWidth={4} strokeLinecap="round" opacity={0.35} />
            ) : null
          })()}

          {/* Month ticks + labels */}
          {MONTHS_SHORT.map((label, mi) => {
            const angle    = (mi / 12) * 360
            const isCurrent = mi === currentMonth && isCurrentYear
            const tickInner = polar(angle, R - 8)
            const tickOuter = polar(angle, R + 4)
            const lp        = polar(angle, R + 26)
            // Tangent rotation: angle - 90 to orient text outward
            const textRot   = angle <= 180 ? angle : angle - 180
            const flip      = angle > 180
            return (
              <g key={mi}>
                <line
                  x1={tickInner.x} y1={tickInner.y}
                  x2={tickOuter.x} y2={tickOuter.y}
                  stroke={isCurrent ? ACCENT : 'var(--text-dim)'}
                  strokeWidth={isCurrent ? 2.5 : 2}
                  strokeLinecap="round"
                  opacity={isCurrent ? 1 : 0.5}
                />
                <text
                  x={lp.x} y={lp.y}
                  textAnchor="middle" dominantBaseline="middle"
                  fontSize={11}
                  fontFamily="DM Mono, monospace"
                  fontWeight={isCurrent ? 700 : 400}
                  fill={isCurrent ? ACCENT : 'var(--text-mid)'}
                  transform={`rotate(${flip ? textRot + 180 : textRot}, ${lp.x}, ${lp.y})`}
                >
                  {label}
                </text>
              </g>
            )
          })}

          {/* Event dots */}
          {dots.map(dot => {
            const pos     = polar(dot.angle, dot.dotR)
            const r       = dot.isGty ? 7 : 5
            const isHover = hoverId === dot.id
            const scale   = isHover ? 1.3 : 1
            const labelR  = dot.dotR + r + 10
            const lp      = polar(dot.angle, labelR)
            const short   = dot.title.length > 14 ? dot.title.slice(0, 13) + '…' : dot.title
            // Flip label if on left half to avoid overflow
            const flipLabel = dot.angle > 180 && dot.angle < 360

            return (
              <g key={dot.id}
                style={{ cursor: 'pointer' }}
                onMouseEnter={e => {
                  setHoverId(dot.id)
                  const d = new Date(dot.date + 'T12:00:00')
                  setTip({
                    x: e.clientX, y: e.clientY,
                    text: [
                      dot.title,
                      d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }),
                      dot.categoryLabel + (dot.isGty ? ' · GTY' : ''),
                    ].join('\n'),
                  })
                }}
                onMouseLeave={() => { setHoverId(null); setTip(null) }}
              >
                {/* Outer ring for GTY */}
                {dot.isGty && (
                  <circle cx={pos.x} cy={pos.y} r={(r + 4) * scale}
                    fill="none" stroke={dot.color} strokeWidth={1.5} opacity={0.5}
                    style={{ transition: 'r 150ms' }}
                  />
                )}
                {/* Main dot */}
                <circle cx={pos.x} cy={pos.y} r={r * scale}
                  fill={dot.color} opacity={0.92}
                  style={{
                    transition: 'r 150ms',
                    filter: dot.isGty ? `drop-shadow(0 0 5px ${dot.color})` : undefined,
                  }}
                />
                {/* Label */}
                <text
                  x={lp.x} y={lp.y}
                  textAnchor={flipLabel ? 'end' : 'start'}
                  dominantBaseline="middle"
                  fontSize={9}
                  fontFamily="DM Mono, monospace"
                  fill="var(--text)"
                  opacity={isHover ? 1 : 0.65}
                  transform={`rotate(${dot.angle <= 180 ? dot.angle - 90 : dot.angle + 90}, ${lp.x}, ${lp.y})`}
                  style={{ pointerEvents: 'none', userSelect: 'none' }}
                >
                  {short}
                </text>
              </g>
            )
          })}

          {/* Hand — tapered line via polygon */}
          {isCurrentYear && (() => {
            const baseLeft  = polar(handAngle - 90, 3)
            const baseRight = polar(handAngle + 90, 3)
            const tipPt     = handTipPos
            return (
              <g>
                {/* Counter-hand */}
                <line
                  x1={CX} y1={CY}
                  x2={handBasePos.x} y2={handBasePos.y}
                  stroke={ACCENT} strokeWidth={1.5} strokeLinecap="round" opacity={0.6}
                />
                {/* Main tapered hand */}
                <polygon
                  points={`${baseLeft.x},${baseLeft.y} ${baseRight.x},${baseRight.y} ${tipPt.x},${tipPt.y}`}
                  fill={ACCENT}
                  opacity={0.95}
                />
              </g>
            )
          })()}

          {/* Center pivot */}
          <circle cx={CX} cy={CY} r={6} fill={ACCENT} />

          {/* Center content */}
          {/* Separator line */}
          <line x1={CX - 20} y1={CY - 8} x2={CX + 20} y2={CY - 8}
            stroke="var(--text-dim)" strokeWidth={0.75} opacity={0.4} />

          {/* Year */}
          <text x={CX} y={CY - 26}
            textAnchor="middle" dominantBaseline="middle"
            fontSize={32} fontWeight={800}
            fontFamily="Syne, sans-serif"
            fill="var(--text)">
            {year}
          </text>
          {/* Date */}
          <text x={CX} y={CY + 8}
            textAnchor="middle" dominantBaseline="middle"
            fontSize={13}
            fontFamily="DM Mono, monospace"
            fill="var(--text-mid)">
            {dayStr}
          </text>
          {/* Time */}
          {isCurrentYear && (
            <text x={CX} y={CY + 26}
              textAnchor="middle" dominantBaseline="middle"
              fontSize={10}
              fontFamily="DM Mono, monospace"
              fill="var(--text-dim)">
              {timeStr}
            </text>
          )}
        </svg>
      </div>

      {/* Legend */}
      <div style={{
        display: 'flex', gap: 24, fontSize: 11,
        color: 'var(--text-dim)', flexWrap: 'wrap', justifyContent: 'center',
        paddingBottom: 8,
      }}>
        {/* GTY entry with ring */}
        <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <svg width={20} height={20} style={{ overflow: 'visible' }}>
            <circle cx={10} cy={10} r={7} fill="#ffffff" opacity={0.92} />
            <circle cx={10} cy={10} r={11} fill="none" stroke="#ffffff" strokeWidth={1.5} opacity={0.5} />
          </svg>
          GTY
        </span>
        {([['#ef4444','RACE'],['#3b82f6','PRO'],['#a855f7','PERSO']] as const).map(([c, l]) => (
          <span key={l} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <svg width={14} height={14}>
              <circle cx={7} cy={7} r={5} fill={c} opacity={0.92} />
            </svg>
            {l}
          </span>
        ))}
      </div>

      {/* Tooltip */}
      {tip && (
        <div style={{
          position: 'fixed', left: tip.x + 14, top: tip.y - 10, zIndex: 1000,
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: 9, padding: '9px 12px', fontSize: 11, color: 'var(--text)',
          pointerEvents: 'none', whiteSpace: 'pre-line', lineHeight: 1.7,
          boxShadow: '0 6px 24px rgba(0,0,0,0.35)',
        }}>
          {tip.text}
        </div>
      )}

      <style>{`@media (max-width: 767px) { #clock-view { display: none !important; } }`}</style>
    </div>
  )
}
