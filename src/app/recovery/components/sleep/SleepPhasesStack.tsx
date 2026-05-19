'use client'
import { useEffect, useState } from 'react'

export interface SleepNightPhases {
  date: string
  totalMin: number; deepMin: number; remMin: number
  lightMin: number; wakeMin: number
}

const SEGS = [
  { key: 'deep',  label: 'Profond',       color: '#1E3A8A' },
  { key: 'rem',   label: 'REM',           color: '#7C3AED' },
  { key: 'light', label: 'Léger',         color: '#60A5FA' },
  { key: 'wake',  label: 'Interruptions', color: '#F97316' },
] as const

function fmtMin(m: number): string {
  const h = Math.floor(m / 60), mm = m % 60
  return h === 0 ? `${mm}min` : mm === 0 ? `${h}h` : `${h}h${String(mm).padStart(2, '0')}`
}

export default function SleepPhasesStack({ nights }: { nights: SleepNightPhases[] }) {
  const [vis, setVis] = useState(0)
  const [tip, setTip] = useState<{ label: string; min: number } | null>(null)

  const sorted = [...nights].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 10)

  useEffect(() => {
    const ts = sorted.map((_, i) =>
      setTimeout(() => setVis(v => Math.max(v, i + 1)), (sorted.length - 1 - i) * 100 + 80)
    )
    return () => ts.forEach(clearTimeout)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sorted.length])

  if (sorted.length === 0) return null

  return (
    <div>
      {/* Legend */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 8, flexWrap: 'wrap' }}>
        {SEGS.map(s => (
          <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, background: s.color }} />
            <span style={{ fontSize: 9, color: 'var(--text-dim)' }}>{s.label}</span>
          </div>
        ))}
      </div>
      {/* Bars */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {sorted.map((n, i) => {
          const show = i < vis
          const d = new Date(n.date + 'T12:00:00').toLocaleDateString('fr-FR', {
            weekday: 'short', day: 'numeric', month: 'short',
          })
          const segs = [
            { ...SEGS[0], min: n.deepMin,  pct: n.totalMin > 0 ? n.deepMin  / n.totalMin * 100 : 0 },
            { ...SEGS[1], min: n.remMin,   pct: n.totalMin > 0 ? n.remMin   / n.totalMin * 100 : 0 },
            { ...SEGS[2], min: n.lightMin, pct: n.totalMin > 0 ? n.lightMin / n.totalMin * 100 : 0 },
            { ...SEGS[3], min: n.wakeMin,  pct: n.totalMin > 0 ? n.wakeMin  / n.totalMin * 100 : 0 },
          ]
          const delay = (sorted.length - 1 - i) * 100 + 200
          return (
            <div key={n.date} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{
                fontSize: 9, color: 'var(--text-dim)', width: 58,
                flexShrink: 0, textTransform: 'capitalize',
              }}>{d}</span>
              <div style={{ flex: 1, height: 16, borderRadius: 3, overflow: 'hidden', display: 'flex' }}>
                {segs.map(s => (
                  <div key={s.key}
                    onMouseEnter={() => setTip({ label: s.label, min: s.min })}
                    onMouseLeave={() => setTip(null)}
                    style={{
                      width: show ? `${s.pct}%` : '0%',
                      height: '100%', background: s.color, flexShrink: 0,
                      transition: `width 0.5s ease-out ${delay}ms`,
                      cursor: 'default',
                    }} />
                ))}
              </div>
              <span style={{
                fontSize: 9, color: 'var(--text-dim)', width: 32,
                textAlign: 'right', fontFamily: 'DM Mono,monospace',
              }}>{fmtMin(n.totalMin)}</span>
            </div>
          )
        })}
      </div>
      {tip && (
        <div style={{
          fontSize: 10, marginTop: 6, padding: '3px 9px',
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: 6, display: 'inline-block', color: 'var(--text)',
        }}>
          {tip.label} · {fmtMin(tip.min)}
        </div>
      )}
    </div>
  )
}
