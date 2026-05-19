'use client'
import { Race, RaceSport, daysUntil } from './types'

const SPORT_DISPLAY: Record<RaceSport, string> = {
  run: 'Running', trail: 'Trail', bike: 'Cyclisme', triathlon: 'Triathlon',
  hyrox: 'Hyrox', swim: 'Natation', rowing: 'Aviron',
}

interface Props {
  gty: Race | undefined
  races: Race[]
  year?: number
}

export default function GoalBanner({ gty, races, year = new Date().getFullYear() }: Props) {
  // Stats for selected year
  const yearRaces = races.filter(r => new Date(r.date).getFullYear() === year)
  const total = yearRaces.length
  const bySport: Partial<Record<RaceSport, number>> = {}
  for (const r of yearRaces) bySport[r.sport] = (bySport[r.sport] ?? 0) + 1

  const parts = (Object.entries(bySport) as [RaceSport, number][])
    .sort(([, a], [, b]) => b - a)
    .map(([s, n]) => `${n} ${SPORT_DISPLAY[s]}`)
    .join(' · ')
  const statLine = total > 0
    ? `${total} course${total > 1 ? 's' : ''}${parts ? ` — ${parts}` : ''}`
    : null

  if (!gty) {
    return (
      <div style={{
        padding: '14px 20px', borderRadius: 14, background: '#111827',
        border: '1px solid #374151', display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' as const,
      }}>
        <p style={{ fontSize: 13, color: '#6B7280', margin: 0, fontStyle: 'italic' }}>
          Aucun objectif principal défini
        </p>
        {statLine && (
          <p style={{ fontSize: 11, color: '#6B7280', margin: 0 }}>{statLine}</p>
        )}
      </div>
    )
  }

  const days = Math.max(0, daysUntil(gty.date))

  return (
    <div style={{
      padding: '18px 24px', borderRadius: 14, background: '#111827',
      border: '1px solid #374151', display: 'flex',
      alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' as const,
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{
          fontSize: 9, fontWeight: 700, letterSpacing: '0.12em',
          textTransform: 'uppercase' as const, color: '#9CA3AF', margin: '0 0 4px',
        }}>
          Goal of the Year
        </p>
        <p style={{
          fontFamily: 'Syne, sans-serif', fontSize: 22, fontWeight: 800,
          color: '#fff', margin: '0 0 3px', lineHeight: 1,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const,
        }}>
          {gty.name}
        </p>
        {gty.goalTime && (
          <p style={{ fontSize: 12, color: '#9CA3AF', margin: '0 0 4px' }}>
            Objectif : {gty.goalTime}
          </p>
        )}
        {gty.distance && !gty.goalTime && (
          <p style={{ fontSize: 12, color: '#9CA3AF', margin: '0 0 4px' }}>{gty.distance}</p>
        )}
        {statLine && (
          <p style={{ fontSize: 10, color: '#6B7280', margin: 0 }}>{statLine}</p>
        )}
      </div>
      <div style={{ textAlign: 'center', flexShrink: 0 }}>
        <p style={{
          fontFamily: 'Syne, sans-serif', fontSize: 38, fontWeight: 800,
          color: '#fff', margin: 0, lineHeight: 1,
        }}>
          {days}
        </p>
        <p style={{ fontSize: 10, color: '#9CA3AF', margin: '4px 0 0' }}>
          {days === 0 ? "C'est aujourd'hui !" : 'jours restants'}
        </p>
      </div>
    </div>
  )
}
