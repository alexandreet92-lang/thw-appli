'use client'
import { useEffect, useState } from 'react'

export interface SleepWindow {
  date: string
  startHour: number  // decimal, 23.5 = 23h30
  endHour: number    // may be > 24 for overnight (e.g. 31 = 7h next day)
}

interface Props { windows: SleepWindow[] }

export default function CircadianClock({ windows }: Props) {
  const [step, setStep] = useState(-1)

  const recent = [...windows].sort((a, b) => a.date.localeCompare(b.date)).slice(-7)

  useEffect(() => {
    const ts = recent.map((_, i) => setTimeout(() => setStep(i), 100 + i * 200))
    return () => ts.forEach(clearTimeout)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recent.length])

  if (windows.length === 0) return null

  const cx = 100, cy = 100, R = 68, STROKE = 12

  // 0h at top (-90°), clockwise
  function toAngleRad(hour: number): number {
    return ((hour / 24) * 360 - 90) * Math.PI / 180
  }

  function arcPath(startH: number, endH: number): string {
    const spanH = endH - startH
    if (spanH <= 0 || spanH > 23) return ''
    const a1 = toAngleRad(startH % 24)
    const spanDeg = (spanH / 24) * 360
    const a2rad = ((startH % 24) / 24 * 360 - 90 + spanDeg) * Math.PI / 180
    const x1 = cx + R * Math.cos(a1), y1 = cy + R * Math.sin(a1)
    const x2 = cx + R * Math.cos(a2rad), y2 = cy + R * Math.sin(a2rad)
    return `M${x1.toFixed(2)} ${y1.toFixed(2)} A${R} ${R} 0 ${spanDeg > 180 ? 1 : 0} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`
  }

  // Regularity = low std-dev of sleep start hours
  const starts = recent.map(w => w.startHour % 24)
  const mean = starts.reduce((a, b) => a + b, 0) / starts.length
  const std = Math.sqrt(starts.reduce((a, b) => a + (b - mean) ** 2, 0) / starts.length)
  const score = Math.max(1, Math.min(10, Math.round(10 - std * 1.8)))
  const scoreColor = score >= 7 ? '#10B981' : score >= 4 ? '#F97316' : '#EF4444'

  // Arc colors from blueish to purplish based on recency
  const arcColor = (i: number) => `hsl(${220 + (i / Math.max(recent.length - 1, 1)) * 50}, 75%, 58%)`

  const TICKS = [0, 3, 6, 9, 12, 15, 18, 21]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
      <svg width={200} height={200} viewBox="0 0 200 200">
        {/* Clock ring */}
        <circle cx={cx} cy={cy} r={R} fill="none" stroke="var(--border)" strokeWidth={1} />
        <circle cx={cx} cy={cy} r={R + STROKE / 2 + 1} fill="none" stroke="var(--border)" strokeWidth={0.5} opacity={0.4} />
        {/* Hour ticks */}
        {TICKS.map(h => {
          const a = toAngleRad(h)
          const isMajor = h % 6 === 0
          const r1 = R - (isMajor ? 5 : 3), r2 = R + (isMajor ? 5 : 3)
          return (
            <g key={h}>
              <line x1={cx+r1*Math.cos(a)} y1={cy+r1*Math.sin(a)}
                x2={cx+r2*Math.cos(a)} y2={cy+r2*Math.sin(a)}
                stroke="var(--text-dim)" strokeWidth={isMajor ? 1.5 : 0.8} />
              {isMajor && (
                <text x={cx+(R+16)*Math.cos(a)} y={cy+(R+16)*Math.sin(a)}
                  textAnchor="middle" dominantBaseline="central"
                  fill="var(--text-dim)" fontSize={7}>
                  {h === 0 ? '0h' : `${h}h`}
                </text>
              )}
            </g>
          )
        })}
        {/* Sleep arcs */}
        {recent.map((w, i) => {
          if (i > step) return null
          const path = arcPath(w.startHour, w.endHour)
          if (!path) return null
          return (
            <path key={w.date} d={path}
              fill="none" stroke={arcColor(i)} strokeWidth={STROKE}
              strokeLinecap="round" opacity={0.50}
              pathLength="1" strokeDasharray="1" strokeDashoffset={0} />
          )
        })}
        {/* Center score */}
        <text x={cx} y={cy - 7} textAnchor="middle" fill={scoreColor}
          fontSize={24} fontWeight={800} fontFamily="Syne,sans-serif">{score}</text>
        <text x={cx} y={cy + 10} textAnchor="middle" fill="var(--text-dim)" fontSize={9}>/10</text>
        <text x={cx} y={cy + 23} textAnchor="middle" fill="var(--text-dim)" fontSize={8}>Régularité</text>
      </svg>
      <p style={{ fontSize: 9, color: 'var(--text-dim)', margin: 0, textAlign: 'center' }}>
        {recent.length} nuits — arcs = plage de sommeil
      </p>
    </div>
  )
}
