'use client'
// Carte d'un bloc EN COURS — ouverte par défaut (badge « En cours », séances déroulées).
// Tokens de thème ; cyan = couleur fonctionnelle assumée.
import { SPORT_COLORS } from '@/lib/constants/blocTypes'
import { currentWeekInBloc, formatBlocRange } from '@/lib/utils/weekDates'
import type { TrainingBlocData } from '@/types/trainingBloc'

const CY = '#22d3ee', ON = '#04141a'

export function BlocCurrentCard({ b, onOpen }: { b: TrainingBlocData; onOpen: (id: string) => void }) {
  const cwb = currentWeekInBloc(b.startWeek, b.durationWeeks)
  return (
    <div onClick={() => onOpen(b.id)} style={{ border: '1px solid rgba(34,211,238,.35)', borderRadius: 13, padding: 13, cursor: 'pointer', background: 'rgba(34,211,238,.04)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8 }}>
        <span style={{ width: 9, height: 9, borderRadius: '50%', background: SPORT_COLORS[b.sport], flexShrink: 0 }} />
        <span style={{ fontSize: 13, fontWeight: 700, flex: 1, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.name}</span>
        <span style={{ fontSize: 9.5, fontWeight: 700, background: CY, color: ON, borderRadius: 5, padding: '2px 7px' }}>En cours</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 9 }}>
        <div style={{ display: 'flex', gap: 3 }}>
          {Array.from({ length: b.durationWeeks }).map((_, i) => (
            <span key={i} style={{ width: 11, height: 4, borderRadius: 4, background: i < cwb ? CY : 'var(--border-mid)' }} />
          ))}
        </div>
        <span style={{ fontSize: 10, color: 'var(--text-dim)' }}>sem. <strong style={{ color: 'var(--text)' }}>{cwb}</strong>/{b.durationWeeks}</span>
        <span style={{ fontSize: 10, color: 'var(--text-dim)', marginLeft: 'auto', whiteSpace: 'nowrap' }}>{formatBlocRange(b.startYear, b.startWeek, b.durationWeeks)}</span>
      </div>

      {b.focus.length > 0 && (
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 10 }}>
          {b.focus.map(q => (
            <span key={q} style={{ fontSize: 10.5, fontWeight: 600, background: 'var(--bg-card2)', color: 'var(--text-mid)', borderRadius: 999, padding: '2px 8px' }}>{q}</span>
          ))}
        </div>
      )}

      <div style={{ borderTop: '1px solid var(--border)', paddingTop: 6 }}>
        {b.sessions.map((s, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '4px 0' }}>
            <span style={{ width: 16, height: 16, borderRadius: 4, background: 'var(--bg-card2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: 'var(--text-dim)', flexShrink: 0 }}>{i + 1}</span>
            <span style={{ fontSize: 11, color: s.type ? 'var(--text-mid)' : 'var(--text-dim)', fontStyle: s.type ? 'normal' : 'italic' }}>{s.type || 'Non défini'}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
