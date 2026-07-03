'use client'
// Bandeau objectif (GTY) — hero calme sur --bg-card2, sans carte noire pleine.
// Tokens uniquement (DESIGN_SYSTEM.md). Compte à rebours = chiffre focal tabulaire.
import { Race, RaceSport, daysUntil } from './types'
import { useI18n } from '@/lib/i18n'

const SPORT_DISPLAY: Record<RaceSport, string> = {
  run: 'Running', trail: 'Trail', bike: 'Cyclisme', triathlon: 'Triathlon',
  hyrox: 'Hyrox', swim: 'Natation', rowing: 'Aviron',
}

const FB = 'var(--font-body)', FD = 'var(--font-display)'
const wrap: React.CSSProperties = {
  background: 'var(--bg-card2)', borderRadius: 'var(--r-md)', padding: 'var(--space-5) var(--space-6)',
  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-5)', flexWrap: 'wrap',
}
const eyebrow: React.CSSProperties = {
  fontFamily: FB, fontSize: 10, fontWeight: 700, letterSpacing: '0.12em',
  textTransform: 'uppercase', color: 'var(--text-dim)', margin: '0 0 var(--space-1)',
}

interface Props { gty: Race | undefined; races: Race[]; year?: number }

export default function GoalBanner({ gty, races, year = new Date().getFullYear() }: Props) {
  const { t } = useI18n()
  const yearRaces = races.filter(r => new Date(r.date).getFullYear() === year)
  const total = yearRaces.length
  const bySport: Partial<Record<RaceSport, number>> = {}
  for (const r of yearRaces) bySport[r.sport] = (bySport[r.sport] ?? 0) + 1
  const parts = (Object.entries(bySport) as [RaceSport, number][])
    .sort(([, a], [, b]) => b - a).map(([s, n]) => `${n} ${SPORT_DISPLAY[s]}`).join(' · ')
  const statLine = total > 0 ? `${t(total > 1 ? 'calendar.racesCountPlural' : 'calendar.racesCount', { n: total })}${parts ? ` — ${parts}` : ''}` : null

  if (!gty) {
    return (
      <div style={wrap}>
        <p style={{ fontFamily: FB, fontSize: 13, color: 'var(--text-mid)', margin: 0 }}>{t('calendar.noMainGoal')}</p>
        {statLine && <p className="tnum" style={{ fontFamily: FB, fontSize: 11, color: 'var(--text-dim)', margin: 0 }}>{statLine}</p>}
      </div>
    )
  }

  const days = Math.max(0, daysUntil(gty.date))
  return (
    <div style={wrap}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={eyebrow}>{t('calendar.yearGoal')}</p>
        <p style={{ fontFamily: FD, fontSize: 22, fontWeight: 600, color: 'var(--text)', margin: '0 0 var(--space-1)', lineHeight: 1.1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{gty.name}</p>
        {gty.goalTime && <p style={{ fontFamily: FB, fontSize: 12, color: 'var(--text-mid)', margin: 0 }}>{t('calendar.goalWithValue', { value: gty.goalTime })}</p>}
        {gty.distance && !gty.goalTime && <p style={{ fontFamily: FB, fontSize: 12, color: 'var(--text-mid)', margin: 0 }}>{gty.distance}</p>}
        {statLine && <p className="tnum" style={{ fontFamily: FB, fontSize: 10, color: 'var(--text-dim)', margin: 'var(--space-1) 0 0' }}>{statLine}</p>}
      </div>
      <div style={{ textAlign: 'center', flexShrink: 0 }}>
        <p className="tnum" style={{ fontFamily: FB, fontSize: 40, fontWeight: 600, color: 'var(--text)', margin: 0, lineHeight: 1 }}>{days}</p>
        <p style={{ fontFamily: FB, fontSize: 10, color: 'var(--text-dim)', margin: 'var(--space-1) 0 0' }}>{days === 0 ? t('calendar.itsToday') : t('calendar.daysLeft')}</p>
      </div>
    </div>
  )
}
