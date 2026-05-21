'use client'

interface Props {
  kcal: number
  prot: number
  gluc: number
  lip:  number
  size?: number
}

type MacroKey = 'prot' | 'gluc' | 'lip'

const DONUTS: Array<{ key: MacroKey; label: string; color: string; max: number }> = [
  { key: 'prot', label: 'Prot', color: '#3B82F6', max: 100 },
  { key: 'gluc', label: 'Gluc', color: '#F97316', max: 300 },
  { key: 'lip',  label: 'Lip',  color: '#8B5CF6', max: 100 },
]

function Donut({ value, max, color, label, size }: {
  value: number; max: number; color: string; label: string; size: number
}) {
  const r  = (size - 8) / 2
  const circ  = 2 * Math.PI * r
  const pct   = max > 0 ? Math.min(value / max, 1) : 0
  const cx    = size / 2
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
      <svg width={size} height={size}>
        <circle cx={cx} cy={cx} r={r} fill="none" stroke="var(--border)" strokeWidth={6} />
        <circle cx={cx} cy={cx} r={r} fill="none" stroke={color} strokeWidth={6}
          strokeDasharray={`${circ}`} strokeDashoffset={circ * (1 - pct)}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.4s ease' }}
          transform={`rotate(-90 ${cx} ${cx})`} />
        <text x={cx} y={cx + 4} textAnchor="middle"
          fill="var(--text)" fontSize={size < 52 ? 8 : 10}
          fontFamily="DM Mono,monospace" fontWeight={700}>
          {value}
        </text>
      </svg>
      <span style={{ fontSize: 9, color: 'var(--text-dim)', fontFamily: 'DM Sans,sans-serif' }}>{label}</span>
    </div>
  )
}

export default function MacroDonuts({ kcal, prot, gluc, lip, size = 56 }: Props) {
  const vals: Record<MacroKey, number> = { prot, gluc, lip }
  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
      <div style={{ textAlign: 'center', minWidth: 44 }}>
        <div style={{ fontSize: 18, fontWeight: 800, color: '#00c8e0', fontFamily: 'Syne,sans-serif', lineHeight: 1 }}>
          {kcal}
        </div>
        <div style={{ fontSize: 9, color: 'var(--text-dim)', fontFamily: 'DM Sans,sans-serif' }}>kcal</div>
      </div>
      {DONUTS.map(d => (
        <Donut key={d.key}
          value={vals[d.key]}
          max={d.max}
          color={d.color}
          label={d.label}
          size={size} />
      ))}
    </div>
  )
}
