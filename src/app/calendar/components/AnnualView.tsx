'use client'
import { Race, RaceStage, RACE_CFG, MONTH_SHORT, daysUntil } from './types'

interface Props {
  races: Race[]
  stages: RaceStage[]
  year: number
  onRaceClick: (race: Race) => void
  onMonthClick: (month: number) => void
  onMarkComplete: (id: string) => void
}

export default function AnnualView({ races, stages, year, onRaceClick, onMonthClick, onMarkComplete }: Props) {
  function racesForMonth(mi: number) {
    return races.filter(r => {
      const d = new Date(r.date)
      return d.getFullYear() === year && d.getMonth() === mi
    }).sort((a, b) => a.date.localeCompare(b.date))
  }

  function stagesForMonth(mi: number) {
    return stages.filter(s => {
      const start = new Date(s.startDate)
      const end   = new Date(s.endDate)
      const mStart = new Date(year, mi, 1)
      const mEnd   = new Date(year, mi + 1, 0)
      return start <= mEnd && end >= mStart
    })
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(4, minmax(140px, 1fr))',
        gap: 10, minWidth: 560,
      }}>
        {MONTH_SHORT.map((label, mi) => {
          const mr = racesForMonth(mi)
          const ms = stagesForMonth(mi)
          const hasItems = mr.length > 0 || ms.length > 0

          return (
            <div
              key={mi}
              onClick={() => onMonthClick(mi)}
              style={{
                background: 'var(--bg-card)', border: '1px solid var(--border)',
                borderRadius: 12, padding: 12, cursor: 'pointer',
                boxShadow: 'var(--shadow-card)',
              }}
            >
              <p style={{
                fontFamily: 'Syne, sans-serif', fontSize: 13, fontWeight: 700,
                margin: '0 0 8px', color: hasItems ? 'var(--text)' : 'var(--text-dim)',
              }}>
                {label}
              </p>

              {/* Races */}
              {mr.map(r => {
                const cfg = RACE_CFG[r.level]
                const isPast = daysUntil(r.date) <= 0
                const isCompleted = r.status === 'completed'
                const day = new Date(r.date).getDate()
                return (
                  <div
                    key={r.id}
                    onClick={e => { e.stopPropagation(); onRaceClick(r) }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 5,
                      padding: '4px 6px', borderRadius: 7,
                      background: isCompleted ? 'var(--bg-card2)' : cfg.bg,
                      border: `1px solid ${isCompleted ? 'var(--border)' : cfg.border + '66'}`,
                      cursor: 'pointer', marginBottom: 4, opacity: isCompleted ? 0.65 : 1,
                    }}
                  >
                    <span style={{
                      width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
                      background: r.level === 'gty' ? '#fff' : cfg.color,
                      border: r.level === 'gty' ? '1px solid #374151' : 'none',
                    }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{
                        fontSize: 10, fontWeight: 600, margin: 0,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const,
                        color: isCompleted ? 'var(--text-dim)' : r.level === 'gty' ? '#fff' : cfg.color,
                      }}>
                        {r.name}
                      </p>
                      <p style={{ fontSize: 9, color: 'var(--text-dim)', margin: 0 }}>
                        {day} {label}
                      </p>
                    </div>
                    {/* Checkmark */}
                    {isPast && !isCompleted && (
                      <button
                        onClick={e => { e.stopPropagation(); onMarkComplete(r.id) }}
                        title="Marquer comme terminée"
                        style={{
                          background: 'none', border: 'none', cursor: 'pointer',
                          color: 'var(--text-dim)', fontSize: 12, padding: '0 2px', flexShrink: 0,
                        }}
                      >
                        ○
                      </button>
                    )}
                    {isCompleted && (
                      <span style={{ fontSize: 11, color: '#22c55e', flexShrink: 0 }}>✓</span>
                    )}
                  </div>
                )
              })}

              {/* Stages */}
              {ms.map(s => (
                <div key={s.id} style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  padding: '4px 6px', borderRadius: 7, marginBottom: 4,
                  background: 'rgba(59,130,246,0.10)', border: '1px solid rgba(59,130,246,0.3)',
                }}>
                  <span style={{ fontSize: 10 }}>🏕</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{
                      fontSize: 10, fontWeight: 500, margin: 0, color: '#3b82f6',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const,
                    }}>
                      {s.name}
                    </p>
                    <p style={{ fontSize: 9, color: 'var(--text-dim)', margin: 0 }}>
                      {new Date(s.startDate).getDate()}→{new Date(s.endDate).getDate()} {label}
                    </p>
                  </div>
                </div>
              ))}

              {!hasItems && (
                <p style={{ fontSize: 10, color: 'var(--text-dim)', margin: 0, fontStyle: 'italic' }}>
                  Aucun
                </p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
