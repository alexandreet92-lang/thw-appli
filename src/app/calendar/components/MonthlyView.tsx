'use client'
import { useState } from 'react'
import { Race, RaceStage, RACE_CFG, MONTHS, getDaysInMonth, getFirstDayISO } from './types'

interface Props {
  races: Race[]
  stages: RaceStage[]
  year: number
  initialMonth?: number
  onRaceClick: (race: Race) => void
}

export default function MonthlyView({ races, stages, year, initialMonth, onRaceClick }: Props) {
  const [month, setMonth] = useState(initialMonth ?? new Date().getMonth())

  const daysInMonth  = getDaysInMonth(year, month)
  const firstDayISO  = getFirstDayISO(year, month) // 1=Mon…7=Sun
  const today        = new Date().toISOString().split('T')[0]

  function racesForDay(day: number) {
    const ds = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    return races.filter(r => r.date === ds)
  }

  function stagesForDay(day: number) {
    const ds = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    return stages.filter(s => s.startDate <= ds && s.endDate >= ds)
  }

  const prevMonth = () => setMonth(m => m === 0 ? 11 : m - 1)
  const nextMonth = () => setMonth(m => m === 11 ? 0 : m + 1)

  return (
    <div style={{
      background: 'var(--bg-card)', border: '1px solid var(--border)',
      borderRadius: 16, padding: 16, boxShadow: 'var(--shadow-card)',
    }}>
      {/* Header nav */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            onClick={prevMonth}
            style={{
              background: 'var(--bg-card2)', border: '1px solid var(--border)',
              borderRadius: 8, padding: '5px 11px', cursor: 'pointer',
              color: 'var(--text-mid)', fontSize: 13,
            }}
          >
            ←
          </button>
          <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: 15, fontWeight: 700, margin: 0 }}>
            {MONTHS[month]} {year}
          </h2>
          <button
            onClick={nextMonth}
            style={{
              background: 'var(--bg-card2)', border: '1px solid var(--border)',
              borderRadius: 8, padding: '5px 11px', cursor: 'pointer',
              color: 'var(--text-mid)', fontSize: 13,
            }}
          >
            →
          </button>
        </div>
      </div>

      {/* Day headers L M M J V S D */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 4 }}>
        {['L','M','M','J','V','S','D'].map((d, i) => (
          <div key={i} style={{
            textAlign: 'center', fontSize: 9, fontWeight: 600,
            color: 'var(--text-dim)', padding: '3px 0',
          }}>
            {d}
          </div>
        ))}
      </div>

      {/* Day grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
        {/* Leading empty cells */}
        {Array.from({ length: firstDayISO - 1 }, (_, i) => (
          <div key={`e${i}`} style={{ minHeight: 62, borderRadius: 7, background: 'var(--bg-card2)', opacity: 0.3 }} />
        ))}

        {/* Day cells */}
        {Array.from({ length: daysInMonth }, (_, i) => {
          const day = i + 1
          const ds  = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
          const dr  = racesForDay(day)
          const ds2 = stagesForDay(day)
          const isToday = ds === today

          return (
            <div
              key={day}
              style={{
                minHeight: 62, borderRadius: 7, background: 'var(--bg-card2)',
                border: `1px solid ${isToday ? '#00c8e0' : 'var(--border)'}`,
                padding: '3px 4px', display: 'flex', flexDirection: 'column' as const, gap: 1,
              }}
            >
              <p style={{
                fontSize: 10, fontWeight: isToday ? 700 : 500,
                color: isToday ? '#00c8e0' : 'var(--text-mid)',
                margin: 0, textAlign: 'right' as const,
              }}>
                {day}
              </p>

              {dr.map(r => {
                const cfg = RACE_CFG[r.level]
                return (
                  <div
                    key={r.id}
                    onClick={() => onRaceClick(r)}
                    style={{
                      borderRadius: 3, padding: '1px 3px', cursor: 'pointer',
                      background: r.status === 'completed' ? 'var(--bg-card)' : cfg.bg,
                      border: `1px solid ${r.status === 'completed' ? 'var(--border)' : cfg.border + '55'}`,
                      opacity: r.status === 'completed' ? 0.6 : 1,
                    }}
                  >
                    <p style={{
                      fontSize: 7, fontWeight: 600, margin: 0,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const,
                      color: r.level === 'gty' ? '#fff' : cfg.color,
                    }}>
                      {r.status === 'completed' ? '✓ ' : ''}{r.name}
                    </p>
                  </div>
                )
              })}

              {ds2.map(s => (
                <div key={s.id} style={{
                  borderRadius: 3, padding: '1px 3px',
                  background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.3)',
                }}>
                  <p style={{
                    fontSize: 7, fontWeight: 500, margin: 0, color: '#3b82f6',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const,
                  }}>
                    {s.name}
                  </p>
                </div>
              ))}
            </div>
          )
        })}
      </div>
    </div>
  )
}
