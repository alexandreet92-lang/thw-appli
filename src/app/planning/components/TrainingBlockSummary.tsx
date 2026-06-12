'use client'
// Section Training Bloc — sans encadré parent (onglets + contenu directement dans le flux).
// Onglet « Training Bloc » = grille 3 colonnes de cartes ; « Training Planification » = frise
// lecture seule cliquable (→ surpage). Surpage = BlocDetailOverlay (createPortal).
import { useState } from 'react'
import { FriseV1 } from '@/components/planning/FriseV1'
import { BlocSummaryView } from '@/components/planning/BlocSummaryView'
import { BlocDetailOverlay } from '@/components/planning/BlocDetailOverlay'
import { SPORT_LABELS, SPORT_COLORS, BLOC_SPORT_KEYS } from '@/lib/constants/blocTypes'
import { currentWeekInBloc } from '@/lib/utils/weekDates'
import { loadBlocs, upsertBloc, newBloc } from '@/app/planning/trainingBlocks'

const T = '#e6edf3' // design-allow-color : maquette dark

export function TrainingBlockSummary() {
  const [tab, setTab] = useState<'bloc' | 'plan'>('bloc')
  const [blocs, setBlocs] = useState(() => loadBlocs())
  const [open, setOpen] = useState(false)
  const [activeId, setActiveId] = useState<string | null>(null)
  const reload = () => setBlocs(loadBlocs())

  function openBloc(id: string) { setActiveId(id); setOpen(true) }
  function createBloc() {
    const firstSport = blocs[0]?.sport ?? BLOC_SPORT_KEYS[0]
    const b = newBloc(firstSport); upsertBloc(b); reload(); openBloc(b.id)
  }
  function openPlan() { if (blocs[0]) openBloc(blocs[0].id); else createBloc() }

  return (
    <section>
      {/* Onglets segmented — sans border autour */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'inline-flex', background: 'rgba(255,255,255,.05)', borderRadius: 10, padding: 3, gap: 2 }}>
          {(['bloc', 'plan'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{ padding: '9px 20px', fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer', borderRadius: 8, transition: 'all .18s', background: tab === t ? '#1b212b' : 'transparent', color: tab === t ? T : 'rgba(230,237,243,.35)', boxShadow: tab === t ? '0 1px 4px rgba(0,0,0,.3)' : 'none' }}>
              {t === 'bloc' ? 'Training Bloc' : 'Training Planification'}
            </button>
          ))}
        </div>
      </div>

      {tab === 'bloc' && <BlocSummaryView blocs={blocs} onOpen={openBloc} onCreate={createBloc} />}

      {tab === 'plan' && (
        <div onClick={openPlan} style={{ padding: '14px 16px 18px', cursor: 'pointer' }}>
          <p style={{ fontSize: 11.5, color: 'rgba(230,237,243,.28)', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ color: '#22d3ee' }}>↔</span>
            12 semaines · <strong style={{ color: 'rgba(230,237,243,.45)' }}>Clique pour modifier</strong>
          </p>
          {blocs.length === 0
            ? <p style={{ fontSize: 13, color: 'rgba(230,237,243,.45)', margin: 0 }}>Aucun bloc à planifier.</p>
            : <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                <FriseV1 blocs={blocs.map(b => ({ sport: b.sport, weekCurrent: currentWeekInBloc(b.startWeek, b.durationWeeks), weekTotal: b.durationWeeks, focus: b.focus, color: SPORT_COLORS[b.sport], label: SPORT_LABELS[b.sport] }))} />
              </div>}
        </div>
      )}

      <BlocDetailOverlay open={open} blocId={activeId} onClose={() => { setOpen(false); reload() }} onChanged={reload} />
    </section>
  )
}
