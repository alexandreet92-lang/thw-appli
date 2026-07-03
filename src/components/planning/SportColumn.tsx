'use client'
// Une colonne par sport : Passés (replié, max 10, récents d'abord) / En cours (ouvert) /
// À venir (replié) + bouton « Nouveau bloc ». Tokens de thème ; cyan/sport = assumés.
import { useState } from 'react'
import { SPORT_LABELS, SPORT_COLORS } from '@/lib/constants/blocTypes'
import { blocPhase, formatBlocRange, getWeekStart } from '@/lib/utils/weekDates'
import type { TrainingBlocData } from '@/types/trainingBloc'
import { BlocCurrentCard } from './BlocCurrentCard'
import { useI18n } from '@/lib/i18n'

const startTs = (b: TrainingBlocData) => getWeekStart(b.startYear, b.startWeek).getTime()

function CompactCard({ b, onOpen, future }: { b: TrainingBlocData; onOpen: (id: string) => void; future?: boolean }) {
  return (
    <div onClick={() => onOpen(b.id)} style={{ border: '1px dashed var(--border)', borderRadius: 11, padding: '9px 12px', cursor: 'pointer', opacity: future ? 0.85 : 0.55, background: 'var(--bg-card)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
        <span style={{ width: 7, height: 7, borderRadius: '50%', background: SPORT_COLORS[b.sport], flexShrink: 0 }} />
        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.name}</span>
      </div>
      <div style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 4 }}>{formatBlocRange(b.startYear, b.startWeek, b.durationWeeks)}</div>
    </div>
  )
}

function Section({ title, count, open, onToggle, children }: { title: string; count: number; open: boolean; onToggle: () => void; children: React.ReactNode }) {
  return (
    <div>
      <div onClick={onToggle} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', padding: '4px 2px' }}>
        <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--text-dim)' }}>{title} · {count}</span>
        <span style={{ fontSize: 9, color: 'var(--text-dim)', display: 'inline-block', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }}>▾</span>
      </div>
      {open && <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 6 }}>{children}</div>}
    </div>
  )
}

export function SportColumn({ sport, blocs, onOpen, onCreate }: {
  sport: string; blocs: TrainingBlocData[]; onOpen: (id: string) => void; onCreate: (sport: string) => void
}) {
  const { t } = useI18n()
  const [showPast, setShowPast] = useState(false)
  const [showFuture, setShowFuture] = useState(false)
  const phaseOf = (b: TrainingBlocData) => blocPhase(b.startYear, b.startWeek, b.durationWeeks)
  const past = blocs.filter(b => phaseOf(b) === 'past').sort((a, b) => startTs(b) - startTs(a)).slice(0, 10)
  const current = blocs.filter(b => phaseOf(b) === 'current').sort((a, b) => startTs(a) - startTs(b))
  const future = blocs.filter(b => phaseOf(b) === 'future').sort((a, b) => startTs(a) - startTs(b))

  return (
    <div style={{ flex: '0 0 280px', display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '2px 2px 4px' }}>
        <span style={{ width: 9, height: 9, borderRadius: '50%', background: SPORT_COLORS[sport] }} />
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{SPORT_LABELS[sport]}</span>
        <span style={{ fontSize: 10.5, color: 'var(--text-dim)', marginLeft: 'auto' }}>{blocs.length}</span>
      </div>

      {past.length > 0 && (
        <Section title={t('planning.past')} count={past.length} open={showPast} onToggle={() => setShowPast(v => !v)}>
          {past.map(b => <CompactCard key={b.id} b={b} onOpen={onOpen} />)}
        </Section>
      )}

      {current.length > 0
        ? current.map(b => <BlocCurrentCard key={b.id} b={b} onOpen={onOpen} />)
        : <div style={{ fontSize: 11, color: 'var(--text-dim)', padding: '6px 2px' }}>{t('planning.noCurrentBloc')}</div>}

      {future.length > 0 && (
        <Section title={t('planning.upcoming')} count={future.length} open={showFuture} onToggle={() => setShowFuture(v => !v)}>
          {future.map(b => <CompactCard key={b.id} b={b} onOpen={onOpen} future />)}
        </Section>
      )}

      <button onClick={() => onCreate(sport)} style={{ padding: '8px', borderRadius: 10, border: '1px dashed var(--border)', background: 'transparent', color: 'var(--text-dim)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>{t('planning.newBlocPlus')}</button>
    </div>
  )
}
