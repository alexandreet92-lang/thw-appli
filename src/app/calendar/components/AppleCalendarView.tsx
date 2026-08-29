'use client'

import { useEffect, useRef, useState } from 'react'
import { Race, RaceStage, RACE_CFG, SPORT_LABEL, MONTHS, MONTH_SHORT, getDaysInMonth, getFirstDayISO } from './types'
import { useI18n } from '@/lib/i18n'

// Bulle d'aperçu (survol) — infos principales d'un objectif, façon page planning.
interface HoverInfo { title: string; lines: string[]; color: string; x: number; y: number }

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

// Chip d'objectif : barre de couleur + nom, plus gros et lisible qu'un point.
function Chip({ color, label, onClick, onEnter, onMove, onLeave }: {
  color: string; label: string
  onClick: (e: React.MouseEvent) => void
  onEnter: (e: React.MouseEvent) => void
  onMove: (e: React.MouseEvent) => void
  onLeave: () => void
}) {
  return (
    <div onClick={onClick} onMouseEnter={onEnter} onMouseMove={onMove} onMouseLeave={onLeave}
      style={{
        display: 'flex', alignItems: 'center', gap: 5,
        padding: '3px 6px 3px 5px', borderRadius: 7, cursor: 'pointer', overflow: 'hidden',
        background: `color-mix(in srgb, ${color} 14%, transparent)`,
        border: `1px solid color-mix(in srgb, ${color} 30%, transparent)`,
      }}>
      <span style={{ width: 3, alignSelf: 'stretch', minHeight: 12, borderRadius: 999, background: color, flexShrink: 0 }} />
      <span style={{ fontSize: 10.5, fontWeight: 700, color, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, letterSpacing: '-0.01em' }}>{label}</span>
    </div>
  )
}

// ── Component ─────────────────────────────────────────────────
export default function AppleCalendarView({ races, stages, year, onDayClick, onRaceClick, onStageDayClick }: Props) {
  const { t } = useI18n()
  const DAY_LABELS = [t('calendar.dow0'),t('calendar.dow1'),t('calendar.dow2'),t('calendar.dow3'),t('calendar.dow4'),t('calendar.dow5'),t('calendar.dow6')]
  const today     = localToday()
  const todayMonth = new Date().getMonth()
  const todayYear  = new Date().getFullYear()
  const containerRef = useRef<HTMLDivElement>(null)
  const [hover, setHover] = useState<HoverInfo | null>(null)

  // Construit le contenu de la bulle d'aperçu pour une course / un stage.
  const raceHover = (r: Race, e: React.MouseEvent): HoverInfo => {
    const d = new Date(r.date + 'T12:00:00')
    const cfg = RACE_CFG[r.level]
    const lines = [
      `${d.getDate()} ${MONTH_SHORT[d.getMonth()]} · ${SPORT_LABEL[r.sport] ?? r.sport}`,
      r.level !== 'gty' ? cfg.label : 'GTY',
      ...(r.distance ? [`Distance : ${r.distance}`] : []),
      ...(r.goalTime ? [`Objectif : ${r.goalTime}`] : []),
    ]
    return { title: r.name, lines, color: r.level === 'gty' ? 'var(--gty-bg)' : cfg.color, x: e.clientX, y: e.clientY }
  }
  const stageHover = (s: RaceStage, e: React.MouseEvent): HoverInfo => {
    const a = new Date(s.startDate + 'T12:00:00'), b = new Date(s.endDate + 'T12:00:00')
    return { title: s.name, lines: [`${a.getDate()} ${MONTH_SHORT[a.getMonth()]} → ${b.getDate()} ${MONTH_SHORT[b.getMonth()]}`, t('calendar.stage')], color: 'var(--cat-pro)', x: e.clientX, y: e.clientY }
  }

  // Scroll to current month on mount (if viewing current year)
  useEffect(() => {
    if (year !== todayYear) return
    const el = containerRef.current?.querySelector(`[data-month="${todayMonth}"]`)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [year, todayMonth, todayYear])

  return (
    <div
      ref={containerRef}
      data-guide="cal-day"
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
          // Un objectif « Événement / Défi » multi-jours (endDate) s'étale sur
          // sa plage, comme un stage → il apparaît dès que sa plage croise le mois.
          const monthRaces  = races.filter(r => {
            const start = new Date(r.date + 'T12:00:00')
            const end   = new Date((r.endDate || r.date) + 'T12:00:00')
            const mStart = new Date(year, mi, 1)
            const mEnd   = new Date(year, mi + 1, 0)
            return start <= mEnd && end >= mStart
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
                  const dayRaces = monthRaces.filter(r => r.date <= ds && (r.endDate || r.date) >= ds)
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

                      {/* Objectifs (courses) — chip couleur = importance */}
                      {dayRaces.map(r => {
                        const cfg = RACE_CFG[r.level]
                        const c = r.level === 'gty' ? 'var(--gty-bg)' : cfg.color
                        return (
                          <Chip key={r.id} color={c} label={r.name}
                            onClick={e => { e.stopPropagation(); onRaceClick?.(r) }}
                            onEnter={e => setHover(raceHover(r, e))}
                            onMove={e => setHover(h => h && ({ ...h, x: e.clientX, y: e.clientY }))}
                            onLeave={() => setHover(null)} />
                        )
                      })}

                      {/* Stages — chip bleu (catégorie pro) */}
                      {dayStages.map(s => (
                        <Chip key={s.id} color="var(--cat-pro)" label={s.name}
                          onClick={e => { e.stopPropagation(); if (onStageDayClick) onStageDayClick(s, ds) }}
                          onEnter={e => setHover(stageHover(s, e))}
                          onMove={e => setHover(h => h && ({ ...h, x: e.clientX, y: e.clientY }))}
                          onLeave={() => setHover(null)} />
                      ))}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {/* Bulle d'aperçu au survol (façon planning) — suit le curseur, non bloquante */}
      {hover && (
        <div style={{
          position: 'fixed', left: Math.min(hover.x + 14, (typeof window !== 'undefined' ? window.innerWidth : 9999) - 240), top: hover.y + 14,
          zIndex: 10000, pointerEvents: 'none', width: 220,
          background: 'var(--bg-card)', border: `1px solid color-mix(in srgb, ${hover.color} 40%, var(--border))`,
          borderRadius: 12, padding: '10px 12px', boxShadow: '0 12px 34px rgba(0,0,0,0.28)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 5 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: hover.color, flexShrink: 0 }} />
            <span style={{ fontFamily: 'Syne, sans-serif', fontSize: 13.5, fontWeight: 800, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{hover.title}</span>
          </div>
          {hover.lines.map((l, i) => (
            <div key={i} style={{ fontSize: 11.5, color: i === 0 ? 'var(--text-mid)' : 'var(--text-dim)', fontWeight: i === 0 ? 600 : 500, lineHeight: 1.5 }}>{l}</div>
          ))}
        </div>
      )}
    </div>
  )
}
