'use client'

// ══════════════════════════════════════════════════════════════════
// MacroDonut — SVG donut chart for a single macro or kcal
// ══════════════════════════════════════════════════════════════════

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
  const stroke = size <= 80 ? 8 : 10
  const r = (size - stroke) / 2
  const cx = size / 2
  const cy = size / 2
  const circ = 2 * Math.PI * r

  const pct = objective > 0 ? Math.min(consumed / objective, 1) : 0
  const overTarget = objective > 0 && consumed > objective * 1.05
  const arcColor = overTarget ? '#ef4444' : color

  const dash = pct * circ
  const gap  = circ - dash

  const valFontSize = size <= 80 ? 11 : 13
  const subFontSize = size <= 80 ? 8  : 10

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Track */}
        <circle
          cx={cx} cy={cy} r={r}
          fill="none"
          stroke="var(--border)"
          strokeWidth={stroke}
        />
        {/* Progress arc */}
        {pct > 0 && (
          <circle
            cx={cx} cy={cy} r={r}
            fill="none"
            stroke={arcColor}
            strokeWidth={stroke}
            strokeDasharray={`${dash} ${gap}`}
            strokeDashoffset={circ / 4}
            strokeLinecap="round"
            style={{ transition: 'stroke-dasharray 0.6s ease, stroke 0.3s' }}
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
        fontSize: 10,
        color: 'var(--text-dim)',
        fontFamily: 'DM Sans,sans-serif',
        textAlign: 'center',
        lineHeight: 1.2,
      }}>
        {label}
      </div>

      {/* Unit */}
      <div style={{
        fontSize: 9,
        color: 'var(--text-dim)',
        fontFamily: 'DM Mono,monospace',
        opacity: 0.7,
      }}>
        {unit}
      </div>
    </div>
  )
}
