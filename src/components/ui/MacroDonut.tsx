'use client'

// ══════════════════════════════════════════════════════════════════
// MacroDonut — SVG donut chart for a single macro or kcal
//
// Animations :
//  • Mount / data-change : arc fill 0 → cible (0.55s ease-out)
//  • Hover               : scale spring, glow drop-shadow, stroke +
//  • Count-up            : valeur centrale animée en JS
// ══════════════════════════════════════════════════════════════════

import { useState, useEffect, useRef } from 'react'

interface MacroDonutProps {
  label: string
  consumed: number
  objective: number
  unit: string
  color: string
  size?: number
}

// ── Tiny count-up hook ───────────────────────────────────────────
function useCountUp(target: number, duration = 550): number {
  const [display, setDisplay] = useState(target)
  const rafRef  = useRef<number>(0)
  const prevRef = useRef<number>(target)

  useEffect(() => {
    const from  = prevRef.current
    const delta = target - from
    if (delta === 0) return
    const start = performance.now()
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1)
      // ease-out cubic
      const ease = 1 - Math.pow(1 - t, 3)
      setDisplay(Math.round(from + delta * ease))
      if (t < 1) { rafRef.current = requestAnimationFrame(tick) }
      else        { prevRef.current = target }
    }
    cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [target, duration])

  return display
}

export function MacroDonut({
  label,
  consumed,
  objective,
  unit,
  color,
  size = 96,
}: MacroDonutProps) {
  const stroke     = size <= 80 ? 8 : 10
  const r          = (size - stroke) / 2
  const cx         = size / 2
  const cy         = size / 2
  const circ       = 2 * Math.PI * r

  const pct        = objective > 0 ? Math.min(consumed / objective, 1) : 0
  const targetDash = pct * circ
  const overTarget = objective > 0 && consumed > objective * 1.05
  const arcColor   = overTarget ? '#ef4444' : color

  // ── Arc fill animation (0 → targetDash chaque fois que la cible change) ──
  const [displayDash, setDisplayDash] = useState(0)
  const arcRaf = useRef<{ r1: number; r2: number }>({ r1: 0, r2: 0 })

  useEffect(() => {
    cancelAnimationFrame(arcRaf.current.r1)
    cancelAnimationFrame(arcRaf.current.r2)
    setDisplayDash(0)
    arcRaf.current.r1 = requestAnimationFrame(() => {
      arcRaf.current.r2 = requestAnimationFrame(() => setDisplayDash(targetDash))
    })
    return () => {
      cancelAnimationFrame(arcRaf.current.r1)
      cancelAnimationFrame(arcRaf.current.r2)
    }
  }, [targetDash])

  // ── Count-up for center number ────────────────────────────────
  const displayValue = useCountUp(Math.round(consumed))

  // ── Hover state ───────────────────────────────────────────────
  const [hovered, setHovered] = useState(false)

  const gap          = Math.max(0, circ - displayDash)
  const valFontSize  = size <= 80 ? 11 : 13
  const subFontSize  = size <= 80 ? 8  : 10

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display:       'flex',
        flexDirection: 'column',
        alignItems:    'center',
        gap:           4,
        transform:     hovered ? 'scale(1.1)' : 'scale(1)',
        transition:    'transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1), filter 0.25s ease',
        filter:        hovered && pct > 0
                         ? `drop-shadow(0 0 8px ${arcColor}55)`
                         : 'none',
        cursor:        'default',
        userSelect:    'none',
      }}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* ── Track ────────────────────────────────────────── */}
        <circle
          cx={cx} cy={cy} r={r}
          fill="none"
          stroke="var(--border)"
          strokeWidth={hovered ? stroke + 1.5 : stroke}
          style={{ transition: 'stroke-width 0.25s ease' }}
        />

        {/* ── Progress arc ─────────────────────────────────── */}
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
              transition: [
                'stroke-dasharray 0.55s cubic-bezier(0.4, 0, 0.2, 1)',
                'stroke-width 0.25s ease',
                'stroke 0.3s ease',
              ].join(', '),
            }}
          />
        )}

        {/* ── Center: value ────────────────────────────────── */}
        <text
          x={cx} y={cy - 3}
          textAnchor="middle"
          fill={overTarget ? '#ef4444' : 'var(--text)'}
          fontSize={valFontSize}
          fontFamily="DM Mono,monospace"
          fontWeight={700}
        >
          {displayValue}
        </text>

        {/* ── Center: objective ────────────────────────────── */}
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

      {/* ── Label ────────────────────────────────────────────── */}
      <div style={{
        fontSize:   10,
        color:      'var(--text-dim)',
        fontFamily: 'DM Sans,sans-serif',
        textAlign:  'center',
        lineHeight: 1.2,
      }}>
        {label}
      </div>

      {/* ── Unit ─────────────────────────────────────────────── */}
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
