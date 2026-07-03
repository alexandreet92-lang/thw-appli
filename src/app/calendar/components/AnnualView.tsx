'use client'
// Vue annuelle — grille 12 mois sur --bg-card2 ; événements en lignes (filet
// catégorie 3px + nom + date + tag priorité). Couleur = catégorie (fonctionnel,
// support minimal) ; priorité = tag texte séparé. Tokens uniquement.
import { Race, RaceStage, MONTH_SHORT, daysUntil } from './types'
import { useI18n } from '@/lib/i18n'

interface Props {
  races: Race[]; stages: RaceStage[]; year: number
  onRaceClick: (race: Race) => void
  onStageClick?: (stage: RaceStage) => void
  onMonthClick: (month: number) => void
  onMarkComplete: (id: string) => void
}

const FB = 'var(--font-body)'
const PRIO_KEY: Record<string, string> = { secondary: 'calendar.prioSecondary', important: 'calendar.prioImportant', main: 'calendar.prioMain', gty: 'calendar.prioGty' }
const raceColor = (level: string) => level === 'gty' ? 'var(--gty-bg)' : 'var(--cat-race)'

function Filet({ color }: { color: string }) {
  return <span style={{ width: 3, alignSelf: 'stretch', borderRadius: 999, background: color, flexShrink: 0 }} />
}
const rowStyle: React.CSSProperties = { display: 'flex', alignItems: 'stretch', gap: 'var(--space-2)', padding: '5px 0', cursor: 'pointer', marginBottom: 2 }
const nameStyle: React.CSSProperties = { fontFamily: FB, fontSize: 11, fontWeight: 600, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text)' }
const metaStyle: React.CSSProperties = { fontFamily: FB, fontSize: 9, color: 'var(--text-dim)', margin: 0 }

export default function AnnualView({ races, stages, year, onRaceClick, onStageClick, onMonthClick, onMarkComplete }: Props) {
  const { t } = useI18n()
  const racesForMonth = (mi: number) => races
    .filter(r => { const d = new Date(r.date); return d.getFullYear() === year && d.getMonth() === mi })
    .sort((a, b) => a.date.localeCompare(b.date))
  const stagesForMonth = (mi: number) => stages.filter(s => {
    const start = new Date(s.startDate), end = new Date(s.endDate)
    return start <= new Date(year, mi + 1, 0) && end >= new Date(year, mi, 1)
  })

  return (
    <div style={{ overflowX: 'auto' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(140px, 1fr))', gap: 'var(--space-3)', minWidth: 560 }}>
        {MONTH_SHORT.map((label, mi) => {
          const mr = racesForMonth(mi), ms = stagesForMonth(mi)
          const hasItems = mr.length > 0 || ms.length > 0
          return (
            <div key={mi} onClick={() => onMonthClick(mi)} style={{ background: 'var(--bg-card2)', borderRadius: 'var(--r-md)', padding: 'var(--space-3)', cursor: 'pointer' }}>
              <p style={{ fontFamily: FB, fontSize: 11, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', margin: '0 0 var(--space-2)', color: hasItems ? 'var(--text-mid)' : 'var(--text-dim)' }}>{label}</p>

              {mr.map(r => {
                const past = daysUntil(r.date) <= 0
                const completed = r.status === 'completed'
                const day = new Date(r.date).getDate()
                return (
                  <div key={r.id} onClick={e => { e.stopPropagation(); onRaceClick(r) }} style={{ ...rowStyle, opacity: past || completed ? 0.6 : 1 }}>
                    <Filet color={raceColor(r.level)} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={nameStyle}>{r.name}</p>
                      <p style={metaStyle}><span className="tnum">{day}</span> {label}{r.level !== 'gty' ? ` · ${t(PRIO_KEY[r.level])}` : ''}</p>
                    </div>
                    {past && !completed && (
                      <button onClick={e => { e.stopPropagation(); onMarkComplete(r.id) }} title={t('calendar.markCompleted')}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)', fontSize: 12, padding: '0 2px', flexShrink: 0 }}>○</button>
                    )}
                    {completed && <span style={{ fontSize: 11, color: 'var(--text-mid)', flexShrink: 0, alignSelf: 'center' }}>✓</span>}
                  </div>
                )
              })}

              {ms.map(s => (
                <div key={s.id} onClick={e => { e.stopPropagation(); onStageClick?.(s) }} style={{ ...rowStyle, cursor: onStageClick ? 'pointer' : 'default' }}>
                  <Filet color="var(--text-mid)" />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={nameStyle}>{s.name}</p>
                    <p style={metaStyle}><span className="tnum">{new Date(s.startDate).getDate()}→{new Date(s.endDate).getDate()}</span> {label} · {t('calendar.stage')}</p>
                  </div>
                </div>
              ))}

              {!hasItems && <p style={{ ...metaStyle, fontStyle: 'italic' }}>{t('calendar.none')}</p>}
            </div>
          )
        })}
      </div>
    </div>
  )
}
