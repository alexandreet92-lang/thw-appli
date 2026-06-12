'use client'
// Section Training Bloc — sans encadré parent (onglets + contenu directement dans le flux).
// Onglet « Training Bloc » = grille 3 colonnes de cartes (→ BlocDetailOverlay) ; « Training
// Planification » = frise lecture seule cliquable (→ GanttOverlay éditable). createPortal.
import { useState } from 'react'
import { FriseV1 } from '@/components/planning/FriseV1'
import { BlocSummaryView } from '@/components/planning/BlocSummaryView'
import { BlocDetailOverlay } from '@/components/planning/BlocDetailOverlay'
import { GanttOverlay } from '@/components/planning/GanttOverlay'
import { BLOC_SPORT_KEYS } from '@/lib/constants/blocTypes'
import { loadBlocs, upsertBloc, newBloc } from '@/app/planning/trainingBlocks'

const T = 'var(--text)' // surface/texte = tokens de thème

export function TrainingBlockSummary() {
  const [tab, setTab] = useState<'bloc' | 'plan'>('bloc')
  const [blocs, setBlocs] = useState(() => loadBlocs())
  const [version, setVersion] = useState(0)
  const [open, setOpen] = useState(false)
  const [gantt, setGantt] = useState(false)
  const [activeId, setActiveId] = useState<string | null>(null)
  const reload = () => { setBlocs(loadBlocs()); setVersion(v => v + 1) }

  function openBloc(id: string) { setActiveId(id); setOpen(true) }
  function createBloc() {
    const firstSport = blocs[0]?.sport ?? BLOC_SPORT_KEYS[0]
    const b = newBloc(firstSport); upsertBloc(b); reload(); openBloc(b.id)
  }

  return (
    <section>
      {/* Onglets segmented — sans border autour */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'inline-flex', background: 'var(--bg-card2)', borderRadius: 10, padding: 3, gap: 2 }}>
          {(['bloc', 'plan'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{ padding: '9px 20px', fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer', borderRadius: 8, transition: 'all .18s', background: tab === t ? 'var(--bg-card)' : 'transparent', color: tab === t ? T : 'var(--text-dim)', boxShadow: tab === t ? 'var(--shadow-card)' : 'none' }}>
              {t === 'bloc' ? 'Training Bloc' : 'Training Planification'}
            </button>
          ))}
        </div>
      </div>

      {tab === 'bloc' && <BlocSummaryView blocs={blocs} onOpen={openBloc} onCreate={createBloc} />}

      {tab === 'plan' && (
        <div onClick={() => setGantt(true)} style={{ padding: '14px 16px 18px', cursor: 'pointer' }}>
          <p style={{ fontSize: 11.5, color: 'var(--text-dim)', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ color: '#22d3ee' }}>↔</span>
            12 semaines · <strong style={{ color: 'var(--text-mid)' }}>Clique pour modifier</strong>
          </p>
          <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', paddingTop: 50 }}>
            <FriseV1 readOnly reloadToken={version} />
          </div>
        </div>
      )}

      <BlocDetailOverlay open={open} blocId={activeId} onClose={() => { setOpen(false); reload() }} onChanged={reload} />
      <GanttOverlay open={gantt} onClose={() => { setGantt(false); reload() }} onChanged={reload} />
    </section>
  )
}
