'use client'
import { SportIcon, SPORT_ICON, type SportKey } from '@/components/icons/SportIcon'

export default function IconsDemo() {
  const sports = Object.keys(SPORT_ICON) as SportKey[]
  return (
    <div style={{ padding: 40, display: 'flex', flexDirection: 'column', gap: 40 }}>
      {(['#0f1117', '#f4f5f7'] as const).map(bg => (
        <div key={bg} style={{ background: bg, padding: 32, borderRadius: 16, display: 'flex', gap: 32, flexWrap: 'wrap' }}>
          {sports.map(s => (
            <div key={s} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
              <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                <SportIcon sport={s} size={64} />
                <SportIcon sport={s} size={40} />
                <SportIcon sport={s} size={24} />
              </div>
              <span style={{ fontSize: 11, color: bg === '#0f1117' ? '#9ca3af' : '#6b7280', textTransform: 'uppercase', letterSpacing: '.08em' }}>
                {SPORT_ICON[s].label}
              </span>
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}
