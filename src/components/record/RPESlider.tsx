'use client'
import { useRef } from 'react'
import { useI18n } from '@/lib/i18n'

interface Props {
  value: number
  onChange: (v: number) => void
  isDark?: boolean
}

function getRpeColor(v: number): string {
  if (v <= 3) return '#10B981'
  if (v <= 6) return '#F59E0B'
  if (v <= 8) return '#F97316'
  return '#EF4444'
}

function getRpeLabel(v: number, t: (key: string) => string): string {
  if (v <= 1) return t('record.rpeVeryEasy')
  if (v <= 3) return t('record.rpeEasy')
  if (v <= 5) return t('record.rpeModerate')
  if (v <= 7) return t('record.rpeHard')
  if (v <= 8.5) return t('record.rpeVeryHard')
  return t('record.rpeMaxEffort')
}

export default function RPESlider({ value, onChange, isDark = false }: Props) {
  const { t } = useI18n()
  const trackRef = useRef<HTMLDivElement>(null)

  const handleMove = (clientX: number) => {
    if (!trackRef.current) return
    const rect = trackRef.current.getBoundingClientRect()
    const percent = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
    onChange(Math.round(percent * 10 * 2) / 2)
  }

  const color = getRpeColor(value)
  const label = getRpeLabel(value, t)
  const fillPct = (value / 10) * 100
  const displayValue = value % 1 === 0 ? value.toFixed(0) : value.toFixed(1)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
      <div style={{ fontSize: 52, fontWeight: 700, color, lineHeight: 1, fontFamily: 'DM Sans, sans-serif' }}>
        {displayValue}
      </div>
      <div style={{ fontSize: 13, color: isDark ? 'rgba(255,255,255,0.55)' : '#6B7280', marginBottom: 8 }}>
        {label}
      </div>
      <div
        ref={trackRef}
        style={{ width: '100%', height: 6, borderRadius: 3, background: isDark ? 'rgba(255,255,255,0.12)' : '#E5E7EB', position: 'relative', cursor: 'pointer', touchAction: 'none' }}
        onMouseDown={e => {
          handleMove(e.clientX)
          const mv = (ev: MouseEvent) => handleMove(ev.clientX)
          const up = () => { document.removeEventListener('mousemove', mv); document.removeEventListener('mouseup', up) }
          document.addEventListener('mousemove', mv)
          document.addEventListener('mouseup', up)
        }}
        onTouchStart={e => { e.preventDefault(); handleMove(e.touches[0].clientX) }}
        onTouchMove={e => { e.preventDefault(); handleMove(e.touches[0].clientX) }}
      >
        <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${fillPct}%`, borderRadius: 3, background: `linear-gradient(90deg, #10B981, ${color})` }} />
        <div style={{
          position: 'absolute', top: '50%', left: `${fillPct}%`,
          transform: 'translate(-50%, -50%)',
          width: 24, height: 24, borderRadius: '50%',
          background: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
          border: `2px solid ${color}`,
          pointerEvents: 'none',
        }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
        <span style={{ fontSize: 11, color: isDark ? 'rgba(255,255,255,0.35)' : '#9CA3AF' }}>0</span>
        <span style={{ fontSize: 11, color: isDark ? 'rgba(255,255,255,0.35)' : '#9CA3AF' }}>10</span>
      </div>
    </div>
  )
}
