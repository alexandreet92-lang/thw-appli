'use client'

// ══════════════════════════════════════════════════════════════════
// MacroDonut — SVG donut chart for a single macro or kcal
// Hover: scale + glow + re-fill animation from 0 → current value
// ══════════════════════════════════════════════════════════════════

import { useState, useEffect } from 'react'

interface MacroDonutProps {
  label: string
  consumed: number
  objective: number
  unit: string         // 'kcal' | 'g'
  color: string        // e.g. '#00c8e0' | '#22c55e' | '#eab308' | '#f97316'
  size?: number        // diameter in px, default 96
}

export function MacroDonut({
  label,
  consumed,
  objective,
  unit,
  color,
  size = 96,
}: MacroDonutProps) {
  const stroke      = size <= 80 ? 8 : 10
  const r           = (size - stroke) / 2
  const cx          = size / 2
  const cy          = size / 2
  const circ        = 2 * Math.PI * r

  const pct         = objective > 0 ? Math.min(consumed / objective, 1) : 0
  const targetDash  = pct * circ
  const overTarget  = objective > 0 && consumed > objective * 1.05
  const arcColor    = overTarget ? '#ef4444' : color

  // ── Animation state ─────────────────────────────────────────────
  const [displayDash, setDisplayDash] = useState(0)
  const [hovered,     setHovered]     = useState(false)
  const [replayKey,   setReplayKey]   = useState(0)

  // Re-animate from 0 → targetDash on mount, hover, or data change
  useEffect(() => {
    let r1: number, r2: number
    setDisplayDash(0)
    r1 = requestAnimationFrame(() => {
      r2 = requestAnimationFrame(() => setDisplayDash(targetDash))
    })
    return () => {
      cancelAnimationFrame(r1)
      cancelAnimationFrame(r2)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [replayKey, targetDash])

  const gap          = circ - displayDash
  const valFontSize  = size <= 80 ? 11 : 13
  const subFontSize  = size <= 80 ? 8  : 10

  return (
    <div
      onMouseEnter={() => { setHovered(true); setReplayKey(k => k + 1) }}
      onMouseLeave={() => setHovered(false)}
      style={{
        display:        'flex',
        flexDirection:  'column',
        alignItems:     'center',
        gap:            4,
        transform:      hovered ? 'scale(1.1)' : 'scale(1)',
        transition:     'transform 0.22s cubic-bezier(0.34, 1.56, 0.64, 1), filter 0.22s ease',
        filter:         hovered ? `drop-shadow(0 0 7px ${arcColor}66)` : 'none',
        cursor:         'default',
        userSelect:     'none',
      }}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Track */}
        <circle
          cx={cx} cy={cy} r={r}
          fill="none"
          stroke="var(--border)"
          strokeWidth={hovered ? stroke + 1.5 : stroke}
          style={{ transition: 'stroke-width 0.22s ease' }}
        />
        {/* Progress arc */}
        {targetDash > 0 && (
          <circle
            cx={cx} cy={cy} r={r}
            fill="none"
            stroke={arcColor}
            strokeWidth={hovered ? stroke + 1.5 : stroke}
            strokeDasharray={`${displayDash} ${gap}`}
            strokeDashoffset={circ / 4}
            strokeLinecap="round"
            style={{
              transition: 'stroke-dasharray 0.55s cubic-bezier(0.4, 0, 0.2, 1), stroke-width 0.22s ease, stroke 0.3s',
            }}
          />
        )}
        {/* Center — consumed value */}
        <text
          x={cx} y={cy - 3}
          textAnchor="middle"
          fill={overTarget ? '#ef4444' : 'var(--text)'}
          fontSize={valFontSize}
          fontFamily="DM Mono,monospace"
          fontWeight={700}
        >
          {Math.round(consumed)}
        </text>
        {/* Center — objective */}
        <text
          x={cx} y={cy + subFontSize + 2}
          textAnchor="middle"
          fill="var(--text-dim)"
          fontSize={subFontSize}
          fontFamily="DM Sans,sans-serif"
        >
          {objective > 0 ? `/ ${Math.round(objective)}` : '—'}
        </text>
      </svg>

      {/* Label */}
      <div style={{
        fontSize:    10,
        color:       'var(--text-dim)',
        fontFamily:  'DM Sans,sans-serif',
        textAlign:   'center',
        lineHeight:  1.2,
      }}>
        {label}
      </div>

      {/* Unit */}
      <div style={{
        fontSize:   9,
        color:      'var(--text-dim)',
        fontFamily: 'DM Mono,monospace',
        opacity:    0.7,
      }}>
        {unit}
      </div>
    </div>
  )
}
