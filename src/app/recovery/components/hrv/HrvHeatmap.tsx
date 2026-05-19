'use client'
import { useEffect, useState } from 'react'

interface HrvRow { date: string; hrv: number }
interface Props { rows: HrvRow[] }

function getColor(hrv: number, min: number, max: number): string {
  const range = Math.max(max - min, 1)
  const pct = (hrv - min) / range
  if (pct < 0.25) return '#EF4444'
  if (pct < 0.50) return '#F59E0B'
  if (pct < 0.75) return '#10B981'
  return '#059669'
}

function isoDateOf(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

const DAY_LABELS = ['L', 'M', 'M', 'J', 'V', 'S', 'D']

export default function HrvHeatmap({ rows }: Props) {
  const [step, setStep] = useState(0)

  useEffect(() => {
    const id = setInterval(() => setStep(s => s + 1), 20)
    return () => clearInterval(id)
  }, [])

  if (rows.length === 0) return null

  const allVals = rows.map(r => r.hrv)
  const min = Math.min(...allVals), max = Math.max(...allVals)
  const byDate = new Map(rows.map(r => [r.date, r.hrv]))

  // Start on Monday of oldest week
  const oldestDate = new Date([...rows].sort((a, b) => a.date.localeCompare(b.date))[0].date + 'T12:00:00')
  const dow = (oldestDate.getDay() + 6) % 7 // Mon=0
  oldestDate.setDate(oldestDate.getDate() - dow)

  const days: { date: string; hrv: number | null }[] = []
  const today = new Date()
  const cursor = new Date(oldestDate)
  while (cursor <= today) {
    const ds = isoDateOf(cursor)
    days.push({ date: ds, hrv: byDate.get(ds) ?? null })
    cursor.setDate(cursor.getDate() + 1)
  }

  // Pad to full weeks
  while (days.length % 7 !== 0) days.push({ date: '', hrv: null })

  const weeks: typeof days[] = []
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7))
  const recentWeeks = weeks.slice(-8)

  return (
    <div>
      {/* Day headers */}
      <div style={{ display: 'flex', gap: 3, marginBottom: 3 }}>
        {DAY_LABELS.map((d, i) => (
          <div key={i} style={{ width: 20, fontSize: 8, color: 'var(--text-dim)', textAlign: 'center', flexShrink: 0 }}>{d}</div>
        ))}
      </div>
      {/* Grid */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {recentWeeks.map((week, wi) => (
          <div key={wi} style={{ display: 'flex', gap: 3 }}>
            {week.map((day, di) => {
              const idx = wi * 7 + di
              const show = idx < step
              return (
                <div
                  key={`${wi}-${di}`}
                  title={day.hrv ? `${day.date}: ${Math.round(day.hrv)} ms` : day.date || ''}
                  style={{
                    width: 20, height: 20, borderRadius: 3, flexShrink: 0,
                    background: show && day.hrv != null
                      ? getColor(day.hrv, min, max)
                      : 'var(--bg-card2)',
                    border: '1px solid var(--border)',
                    transition: 'background 0.15s ease-out',
                    cursor: day.hrv ? 'default' : 'default',
                  }}
                />
              )
            })}
          </div>
        ))}
      </div>
      {/* Legend */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8 }}>
        <span style={{ fontSize: 8, color: 'var(--text-dim)' }}>Bas</span>
        {['#EF4444', '#F59E0B', '#10B981', '#059669'].map(c => (
          <div key={c} style={{ width: 12, height: 12, borderRadius: 2, background: c }} />
        ))}
        <span style={{ fontSize: 8, color: 'var(--text-dim)' }}>Élevé</span>
      </div>
    </div>
  )
}
