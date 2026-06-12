'use client'
// Vue « Training Bloc » : grille 3 colonnes de cartes. Chaque carte = sport + nom + pips +
// PLAGE DE DATES réelle (jamais de numéro de semaine ISO) + qualités + séances déroulantes.
import { useState } from 'react'
import { SPORT_LABELS, SPORT_COLORS } from '@/lib/constants/blocTypes'
import { currentWeekInBloc, formatBlocRange } from '@/lib/utils/weekDates'
import { blocsCountBySport } from '@/app/planning/trainingBlocks'
import type { TrainingBlocData } from '@/types/trainingBloc'

const T = '#e6edf3', DIM = 'rgba(230,237,243,.38)', CY = '#22d3ee' // design-allow-color : maquette dark

export function BlocSummaryView({ blocs, onOpen, onCreate }: {
  blocs: TrainingBlocData[]; onOpen: (id: string) => void; onCreate: () => void
}) {
  const [sessOpen, setSessOpen] = useState<Record<string, boolean>>({})
  const counts = blocsCountBySport(blocs)

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 22 }}>
      {blocs.map(b => {
        const cwb = currentWeekInBloc(b.startWeek, b.durationWeeks)
        const range = formatBlocRange(b.startYear, b.startWeek, b.durationWeeks)
        return (
          <div key={b.id} onClick={() => onOpen(b.id)} style={{ border: '1px solid rgba(255,255,255,.08)', borderRadius: 13, padding: 14, cursor: 'pointer', background: '#161b22', transition: 'border-color .15s' }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = CY)} onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,.08)')}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8 }}>
              <span style={{ width: 9, height: 9, borderRadius: '50%', background: SPORT_COLORS[b.sport], flexShrink: 0 }} />
              <span style={{ fontSize: 13, fontWeight: 700, flex: 1, color: T }}>{SPORT_LABELS[b.sport]}</span>
              <span style={{ fontSize: 10.5, color: DIM, background: 'rgba(255,255,255,.05)', borderRadius: 5, padding: '2px 7px', maxWidth: 90, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.name}</span>
              {counts[b.sport] > 1 && <span style={{ fontSize: 10, background: `${SPORT_COLORS[b.sport]}22`, color: SPORT_COLORS[b.sport], borderRadius: 5, padding: '2px 6px' }}>+{counts[b.sport] - 1}</span>}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 9 }}>
              <div style={{ display: 'flex', gap: 3 }}>
                {Array.from({ length: b.durationWeeks }).map((_, i) => (
                  <span key={i} style={{ width: 11, height: 4, borderRadius: 4, background: i < cwb ? CY : 'rgba(255,255,255,.12)' }} />
                ))}
              </div>
              <span style={{ fontSize: 10, color: DIM }}>sem. <strong style={{ color: T }}>{cwb}</strong>/{b.durationWeeks}</span>
              <span style={{ fontSize: 10, color: 'rgba(230,237,243,.25)', marginLeft: 'auto', whiteSpace: 'nowrap' }}>{range}</span>
            </div>

            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 10, minHeight: 18 }}>
              {b.focus.map(q => (
                <span key={q} style={{ fontSize: 10.5, fontWeight: 600, background: 'rgba(255,255,255,.07)', color: 'rgba(230,237,243,.55)', borderRadius: 999, padding: '2px 8px' }}>{q}</span>
              ))}
            </div>

            <div>
              <div onClick={e => { e.stopPropagation(); setSessOpen(o => ({ ...o, [b.id]: !o[b.id] })) }}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', padding: '5px 0', borderTop: '1px solid rgba(255,255,255,.05)' }}>
                <span style={{ fontSize: 12, color: DIM }}><strong style={{ color: T }}>{b.sessions.length}</strong> séances</span>
                <span style={{ fontSize: 9, color: 'rgba(230,237,243,.25)', display: 'inline-block', transition: 'transform .2s', transform: sessOpen[b.id] ? 'rotate(180deg)' : 'rotate(0)' }}>▾</span>
              </div>
              {sessOpen[b.id] && (
                <div>
                  {b.sessions.map((s, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '5px 0', borderTop: '1px solid rgba(255,255,255,.04)' }}>
                      <span style={{ width: 16, height: 16, borderRadius: 4, background: 'rgba(255,255,255,.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: 'rgba(230,237,243,.35)', flexShrink: 0 }}>{i + 1}</span>
                      <span style={{ fontSize: 11, color: s.type ? 'rgba(230,237,243,.55)' : 'rgba(230,237,243,.25)', fontStyle: s.type ? 'normal' : 'italic' }}>{s.type || 'Non défini'}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )
      })}

      {blocs.length === 0 && (
        <div style={{ gridColumn: '1/-1', padding: '18px 14px', color: DIM, fontSize: 13 }}>
          Aucun bloc actif · <span style={{ color: CY, cursor: 'pointer', fontWeight: 600 }} onClick={onCreate}>+ Créer un bloc</span>
        </div>
      )}
    </div>
  )
}
