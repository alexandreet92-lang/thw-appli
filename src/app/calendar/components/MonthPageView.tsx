'use client'
// ════════════════════════════════════════════════════════════════════
// MonthPageView — vue mensuelle façon calendrier iOS (image 1) : en-tête avec
// bouton retour « ‹ année », nom du mois, ligne des jours de semaine, grille
// des jours avec pastilles d'objectifs (couleur = importance) + « +N » en
// débordement, jour du jour en pastille rouge. Entrée en zoom (continuité avec
// la vue annuelle). Tap sur un jour → sur-page d'ajout ; tap sur une pastille
// → détail de l'objectif.
// ════════════════════════════════════════════════════════════════════
import { useEffect, useState } from 'react'
import { Race, RaceStage, MONTHS, RACE_CFG, getDaysInMonth, getFirstDayISO } from './types'
import { useI18n } from '@/lib/i18n'

interface Props {
  year: number
  month: number
  races: Race[]
  stages: RaceStage[]
  onBack: () => void
  onDayClick: (date: string) => void
  onRaceClick: (race: Race) => void
  onStageDayClick: (stage: RaceStage, date: string) => void
}

const RED = '#ef4444' // design-allow-color

function iso(y: number, m: number, d: number): string {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

export default function MonthPageView({ year, month, races, stages, onBack, onDayClick, onRaceClick, onStageDayClick }: Props) {
  const { t } = useI18n()
  const DOW = [t('calendar.dow0'), t('calendar.dow1'), t('calendar.dow2'), t('calendar.dow3'), t('calendar.dow4'), t('calendar.dow5'), t('calendar.dow6')]
  const now = new Date()
  const todayISO = iso(now.getFullYear(), now.getMonth(), now.getDate())
  const dim = getDaysInMonth(year, month)
  const lead = getFirstDayISO(year, month) - 1

  const [shown, setShown] = useState(false)
  useEffect(() => { const id = requestAnimationFrame(() => setShown(true)); return () => cancelAnimationFrame(id) }, [])

  const monthRaces = races.filter(r => {
    const start = new Date(r.date + 'T12:00:00'), end = new Date((r.endDate || r.date) + 'T12:00:00')
    return start <= new Date(year, month + 1, 0) && end >= new Date(year, month, 1)
  })
  const monthStages = stages.filter(s => {
    const start = new Date(s.startDate + 'T12:00:00'), end = new Date(s.endDate + 'T12:00:00')
    return start <= new Date(year, month + 1, 0) && end >= new Date(year, month, 1)
  })

  return (
    <div style={{
      transform: shown ? 'scale(1)' : 'scale(0.92)',
      opacity: shown ? 1 : 0,
      transition: 'transform 0.28s cubic-bezier(0.32,0.72,0,1), opacity 0.24s ease',
      transformOrigin: 'center top',
    }}>
      {/* En-tête : retour + mois */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
        <button
          onClick={onBack}
          aria-label={String(year)}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 3, cursor: 'pointer',
            background: 'none', border: 'none', padding: '4px 6px 4px 0',
            color: RED, fontSize: 17, fontWeight: 700, fontFamily: 'Syne, sans-serif',
          }}
        >
          <svg width="11" height="18" viewBox="0 0 11 18"><path d="M9 2 L2 9 L9 16" stroke="currentColor" strokeWidth="2.4" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
          {year}
        </button>
      </div>
      <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: 30, fontWeight: 800, margin: '0 0 10px', letterSpacing: '-0.02em' }}>
        {MONTHS[month]}
      </h2>

      {/* Jours de semaine */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: '1px solid var(--border)', paddingBottom: 6, marginBottom: 2 }}>
        {DOW.map((d, i) => (
          <div key={i} style={{ textAlign: 'center', fontSize: 11, fontWeight: 700, color: 'var(--text-dim)', letterSpacing: '0.04em' }}>{d}</div>
        ))}
      </div>

      {/* Grille des jours */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
        {Array.from({ length: lead }, (_, i) => <div key={`e${i}`} />)}
        {Array.from({ length: dim }, (_, i) => {
          const day = i + 1
          const ds = iso(year, month, day)
          const isToday = ds === todayISO
          const dayRaces = monthRaces.filter(r => r.date <= ds && (r.endDate || r.date) >= ds)
          const dayStages = monthStages.filter(s => s.startDate <= ds && s.endDate >= ds)
          type Item = { key: string; label: string; color: string; onClick: () => void }
          const items: Item[] = [
            ...dayRaces.map(r => ({ key: r.id, label: r.name, color: r.level === 'gty' ? RED : RACE_CFG[r.level].color, onClick: () => onRaceClick(r) })),
            ...dayStages.map(s => ({ key: s.id, label: s.name, color: 'var(--cat-pro)', onClick: () => onStageDayClick(s, ds) })),
          ]
          const shownItems = items.slice(0, 2)
          const extra = items.length - shownItems.length
          return (
            <div
              key={day}
              onClick={() => onDayClick(ds)}
              style={{
                minHeight: 78, padding: '4px 3px 5px', cursor: 'pointer',
                display: 'flex', flexDirection: 'column', gap: 3,
                borderBottom: '1px solid var(--border)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <span style={{
                  width: 26, height: 26, borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 14, fontWeight: isToday ? 700 : 500,
                  background: isToday ? RED : 'transparent',
                  color: isToday ? '#fff' : 'var(--text)', // design-allow-color
                }}>
                  {day}
                </span>
              </div>
              {shownItems.map(it => (
                <div
                  key={it.key}
                  onClick={e => { e.stopPropagation(); it.onClick() }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 3, padding: '2px 4px', borderRadius: 5,
                    background: `color-mix(in srgb, ${it.color} 15%, transparent)`, overflow: 'hidden',
                  }}
                >
                  <span style={{ width: 3, alignSelf: 'stretch', minHeight: 9, borderRadius: 2, background: it.color, flexShrink: 0 }} />
                  <span style={{ fontSize: 9, fontWeight: 700, color: it.color, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.label}</span>
                </div>
              ))}
              {extra > 0 && (
                <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-dim)', paddingLeft: 4 }}>+{extra}</span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
