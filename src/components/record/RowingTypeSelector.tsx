'use client'
import { ROWING_PRACTICE_TYPES } from '@/types/rowing'
import { useI18n } from '@/lib/i18n'

interface Props {
  selected: string
  onChange: (id: string) => void
  isDark: boolean
}

export default function RowingTypeSelector({ selected, onChange, isDark }: Props) {
  const { t: tr } = useI18n()
  const text = isDark ? '#FFF' : '#0A0A0A'
  const border = isDark ? 'rgba(255,255,255,0.12)' : '#E5E7EB'
  const surfaceMuted = isDark ? 'rgba(255,255,255,0.06)' : '#F3F4F6'
  const ACCENT = '#06B6D4'

  return (
    <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
      {ROWING_PRACTICE_TYPES.map(t => {
        const active = selected === t.id
        return (
          <button key={t.id} onClick={() => onChange(t.id)}
            style={{
              padding:'8px 14px', borderRadius:20,
              background: active ? `rgba(6,182,212,0.12)` : surfaceMuted,
              border: `1.5px solid ${active ? ACCENT : border}`,
              color: active ? ACCENT : text,
              fontSize:14, fontWeight: active ? 600 : 400,
              cursor:'pointer', fontFamily:'DM Sans, sans-serif',
              transition:'all 120ms',
            }}>
            {t.labelKey ? tr(t.labelKey) : t.label}
          </button>
        )
      })}
    </div>
  )
}
