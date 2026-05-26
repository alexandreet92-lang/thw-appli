'use client'

export const POOL_SIZES = [
  { id: '20',   label: '20 m' },
  { id: '25',   label: '25 m' },
  { id: '50',   label: '50 m' },
  { id: 'lake', label: 'Lac' },
  { id: 'sea',  label: 'Mer / Océan' },
]

interface Props {
  value: string
  onChange: (id: string) => void
  isDark?: boolean
}

export default function SwimmingPoolSelector({ value, onChange, isDark = false }: Props) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      {POOL_SIZES.map(p => {
        const active = value === p.id
        return (
          <button
            key={p.id}
            onClick={() => onChange(p.id)}
            style={{
              padding: '10px 16px', borderRadius: 9999, fontSize: 14, fontWeight: 500,
              border: active ? 'none' : `1px solid ${isDark ? 'rgba(255,255,255,0.15)' : '#E5E7EB'}`,
              background: active
                ? 'linear-gradient(135deg, #06B6D4, #2563EB)'
                : isDark ? 'rgba(255,255,255,0.06)' : '#F9FAFB',
              color: active ? '#fff' : isDark ? '#fff' : '#374151',
              cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', transition: 'all 150ms',
            }}
          >
            {p.label}
          </button>
        )
      })}
    </div>
  )
}
