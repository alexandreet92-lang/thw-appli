'use client'

const s = {
  stroke: 'currentColor', strokeWidth: 1.6, fill: 'none' as const,
  strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const,
}

function CrawlIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24">
      <path d="M2 14 Q6 10 10 14 Q14 18 18 14 Q21 10 22 12" {...s}/>
      <path d="M2 9 Q6 5 10 9 Q14 13 18 9" {...s}/>
      <circle cx="17" cy="5" r="1.5" {...s}/>
      <path d="M8 8 l4-2 3 3" {...s}/>
    </svg>
  )
}

function BackstrokeIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24">
      <path d="M2 17 Q6 13 10 17 Q14 21 18 17 Q21 13 22 15" {...s}/>
      <circle cx="8" cy="5" r="1.5" {...s}/>
      <path d="M8 7 v5" {...s}/>
      <path d="M5 9 h6" {...s}/>
      <path d="M11 12 l4 3" {...s}/>
    </svg>
  )
}

function BreaststrokeIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24">
      <path d="M2 17 Q6 13 10 17 Q14 21 18 17 Q21 13 22 15" {...s}/>
      <circle cx="12" cy="4" r="1.5" {...s}/>
      <path d="M7 9 Q9 7 12 7 Q15 7 17 9" {...s}/>
      <path d="M7 9 Q9 12 12 11 Q15 12 17 9" {...s}/>
    </svg>
  )
}

function ButterflyIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24">
      <path d="M2 17 Q6 13 10 17 Q14 21 18 17 Q21 13 22 15" {...s}/>
      <circle cx="12" cy="4" r="1.5" {...s}/>
      <path d="M6 9 Q9 6 12 7" {...s}/>
      <path d="M18 9 Q15 6 12 7" {...s}/>
      <path d="M6 9 Q9 13 12 11" {...s}/>
      <path d="M18 9 Q15 13 12 11" {...s}/>
    </svg>
  )
}

function MixedIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24">
      <path d="M2 18 Q5 15 8 18 Q11 21 14 18 Q17 15 22 18" {...s}/>
      <path d="M3 11 h4 M8 8 v6 M13 8 v6 M17 11 h4" {...s}/>
    </svg>
  )
}

const SWIM_STROKES = [
  { id: 'freestyle',    label: 'Crawl',    Icon: CrawlIcon },
  { id: 'backstroke',   label: 'Dos',      Icon: BackstrokeIcon },
  { id: 'breaststroke', label: 'Brasse',   Icon: BreaststrokeIcon },
  { id: 'butterfly',    label: 'Papillon', Icon: ButterflyIcon },
  { id: 'mixed',        label: 'Mixte',    Icon: MixedIcon },
]

export { SWIM_STROKES }

interface Props {
  value: string
  onChange: (id: string) => void
  isDark?: boolean
}

export default function SwimmingStrokeSelector({ value, onChange, isDark = false }: Props) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      {SWIM_STROKES.map(({ id, label, Icon }) => {
        const active = value === id
        return (
          <button
            key={id}
            onClick={() => onChange(active ? '' : id)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 14px', borderRadius: 9999, fontSize: 14, fontWeight: 500,
              border: active ? 'none' : `1px solid ${isDark ? 'rgba(255,255,255,0.15)' : '#E5E7EB'}`,
              background: active
                ? 'linear-gradient(135deg, #06B6D4, #2563EB)'
                : isDark ? 'rgba(255,255,255,0.06)' : '#F9FAFB',
              color: active ? '#fff' : isDark ? '#fff' : '#374151',
              cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', transition: 'all 150ms',
            }}
          >
            <Icon />
            {label}
          </button>
        )
      })}
    </div>
  )
}
