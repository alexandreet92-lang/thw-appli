'use client'

import { useEffect, useRef } from 'react'
import { Race, RaceStage, RACE_CFG, MONTHS, getDaysInMonth, getFirstDayISO } from './types'

// ── Types ─────────────────────────────────────────────────────
interface Props {
  races:   Race[]
  stages:  RaceStage[]
  year:    number
  onDayClick?:      (date: string) => void
  onRaceClick?:     (race: Race) => void
  onStageDayClick?: (stage: RaceStage, date: string) => void
}

// ── Helpers ───────────────────────────────────────────────────
function localToday(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

function fmtDate(y: number, m: number, d: number): string {
  return `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`
}

const DAY_LABELS = ['L','M','M','J','V','S','D']

// ── Component ─────────────────────────────────────────────────
export default function AppleCalendarView({ races, stages, year, onDayClick, onRaceClick, onStageDayClick }: Props) {
  const today     = localToday()
  const todayMonth = new Date().getMonth()
  const todayYear  = new Date().getFullYear()
  const containerRef = useRef<HTMLDivElement>(null)

  // Scroll to current month on mount (if viewing current year)
  useEffect(() => {
    if (year !== todayYear) return
    const el = containerRef.current?.querySelector(`[data-month="${todayMonth}"]`)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [year, todayMonth, todayYear])

  return (
    <div
      ref={containerRef}
      style={{
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: 16, overflow: 'hidden', boxShadow: 'var(--shadow-card)',
      }}
    >
      {/* Sticky day-of-week header */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)',
        gap: 0, padding: '8px 12px 6px',
        position: 'sticky', top: 0, zIndex: 10,
        background: 'var(--bg-card)',
        borderBottom: '1px solid var(--border)',
      }}>
        {DAY_LABELS.map((d, i) => (
          <div key={i} style={{ textAlign: 'center', fontSize: 10, fontWeight: 600, color: 'var(--text-dim)' }}>
            {d}
          </div>
        ))}
      </div>

      {/* Months */}
      <div style={{ maxHeight: 640, overflowY: 'auto' }}>
        {MONTHS.map((monthName, mi) => {
          const daysInMonth = getDaysInMonth(year, mi)
          const firstDay    = getFirstDayISO(year, mi) // 1=Mon…7=Sun

          // Races & stages for this month
          const monthRaces  = races.filter(r => {
            const d = new Date(r.date + 'T12:00:00')
            return d.getFullYear() === year && d.getMonth() === mi
          })
          const monthStages = stages.filter(s => {
            const start = new Date(s.startDate + 'T12:00:00')
            const end   = new Date(s.endDate   + 'T12:00:00')
            const mStart = new Date(year, mi, 1)
            const mEnd   = new Date(year, mi + 1, 0)
            return start <= mEnd && end >= mStart
          })

          return (
            <div key={mi} data-month={mi} style={{ paddingBottom: 4 }}>
              {/* Sticky month header */}
              <div style={{
                position: 'sticky', top: 33, zIndex: 9,
                background: 'var(--bg-card)',
                padding: '10px 16px 6px',
                borderBottom: '1px solid var(--border)',
              }}>
                <p style={{
                  fontFamily: 'Syne, sans-serif', fontSize: 20, fontWeight: 800,
                  margin: 0, color: 'var(--text)',
                }}>
                  {monthName}
                </p>
              </div>

              {/* Day grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1, padding: '4px 4px' }}>
                {/* Leading empty cells */}
                {Array.from({ length: firstDay - 1 }, (_, i) => (
                  <div key={`e${i}`} style={{ minHeight: 80 }} />
                ))}

                {/* Day cells */}
                {Array.from({ length: daysInMonth }, (_, i) => {
                  const day      = i + 1
                  const ds       = fmtDate(year, mi, day)
                  const isToday  = ds === today
                  const dayRaces = monthRaces.filter(r => r.date === ds)
                  const dayStages = monthStages.filter(s => s.startDate <= ds && s.endDate >= ds)
                  const hasEvents = dayRaces.length > 0 || dayStages.length > 0

                  return (
                    <div
                      key={day}
                      onClick={() => {
                        if (hasEvents && dayRaces.length === 0 && dayStages.length === 1 && onStageDayClick) {
                          onStageDayClick(dayStages[0], ds)
                        } else {
                          onDayClick?.(ds)
                        }
                      }}
                      style={{
                        minHeight: 80,
                        padding: '5px 5px 4px',
                        cursor: 'pointer',
                        display: 'flex', flexDirection: 'column', gap: 2,
                        borderRadius: 7,
                        background: hasEvents ? 'rgba(6,182,212,0.03)' : 'transparent',
                        border: `1px solid ${hasEvents ? 'rgba(6,182,212,0.12)' : 'transparent'}`,
                      }}
                    >
                      {/* Day number */}
                      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <span style={{
                          width: 24, height: 24, borderRadius: '50%',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 12, fontWeight: isToday ? 700 : 400,
                          background: isToday ? '#ef4444' : 'transparent',
                          color: isToday ? '#fff' : 'var(--text-mid)',
                          flexShrink: 0,
                        }}>
                          {day}
                        </span>
                      </div>

                      {/* Race dots */}
                      {dayRaces.map(r => {
                        const cfg = RACE_CFG[r.level]
                        const dotColor = r.level === 'gty' ? '#fff' : cfg.color
                        return (
                          <div
                            key={r.id}
                            onClick={e => { e.stopPropagation(); onRaceClick?.(r) }}
                            style={{
                              display: 'flex', alignItems: 'center', gap: 3,
                              padding: '2px 4px', borderRadius: 4,
                              background: r.level === 'gty' ? 'rgba(17,24,39,0.9)' : `${cfg.color}22`,
                              cursor: 'pointer',
                              overflow: 'hidden',
                            }}
                          >
                            <span style={{
                              width: 5, height: 5, borderRadius: '50%',
                              background: dotColor, flexShrink: 0,
                            }} />
                            <span style={{
                              fontSize: 9, fontWeight: 600, color: dotColor,
                              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                              flex: 1,
                            }}>
                              {r.name}
                            </span>
                          </div>
                        )
                      })}

                      {/* Stage dots */}
                      {dayStages.map(s => (
                        <div
                          key={s.id}
                          onClick={e => {
                            e.stopPropagation()
                            if (onStageDayClick) onStageDayClick(s, ds)
                          }}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 3,
                            padding: '2px 4px', borderRadius: 4,
                            background: 'rgba(59,130,246,0.12)',
                            cursor: 'pointer', overflow: 'hidden',
                          }}
                        >
                          <span style={{
                            width: 5, height: 5, borderRadius: '50%',
                            background: '#3b82f6', flexShrink: 0,
                          }} />
                          <span style={{
                            fontSize: 9, fontWeight: 600, color: '#3b82f6',
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                            flex: 1,
                          }}>
                            {s.name}
                          </span>
                        </div>
                      ))}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
