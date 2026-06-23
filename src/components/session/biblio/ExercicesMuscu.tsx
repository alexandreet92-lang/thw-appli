'use client'
// Muscu › Exercices : écran GROUPES (5 bulles) → LISTE filtrable → FICHE.
import { useState, useMemo } from 'react'
import { IconSearch, IconAdjustmentsHorizontal, IconArrowLeft, IconChevronRight } from '@tabler/icons-react'
import {
  EXERCICES_MUSCU, GROUPE_ORDER, GROUPE_LABEL, MODE_LABEL,
  modePrimaire, type Exercice, type Groupe,
} from '@/data/exercices'
import { useExerciceFilter, appliquerFiltre } from './useExerciceFilter'
import { FiltreSheet } from './FiltreSheet'
import { ExerciceFiche } from './ExerciceFiche'

const FD = 'var(--font-display)', FB = 'var(--font-body)'

function SearchBar({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', padding: '0 12px', height: 42,
      borderRadius: 'var(--r-sm)', background: 'var(--bg-card2)', flex: 1, minWidth: 0 }}>
      <IconSearch size={17} style={{ color: 'var(--text-dim)', flexShrink: 0 }} />
      <input value={value} onChange={e => onChange(e.target.value)} placeholder="Rechercher un exercice…"
        style={{ flex: 1, minWidth: 0, border: 'none', outline: 'none', background: 'transparent', color: 'var(--text)',
          fontFamily: FB, fontSize: 13 }} />
    </div>
  )
}

function FiltreBtn({ n, onClick }: { n: number; onClick: () => void }) {
  return (
    <button onClick={onClick} aria-label="Filtrer" style={{ display: 'flex', alignItems: 'center', gap: 6, height: 42,
      padding: '0 14px', borderRadius: 'var(--r-sm)', border: 'none', cursor: 'pointer', flexShrink: 0,
      background: n > 0 ? 'var(--primary-dim)' : 'var(--bg-card2)', color: n > 0 ? 'var(--primary)' : 'var(--text-mid)',
      fontFamily: FB, fontSize: 13, fontWeight: 500 }}>
      <IconAdjustmentsHorizontal size={17} /> Filtrer{n > 0 ? ` · ${n}` : ''}
    </button>
  )
}

function ExoCard({ exo, showGroupe, onClick }: { exo: Exercice; showGroupe: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', width: '100%',
      textAlign: 'left', padding: 'var(--space-4)', borderRadius: 'var(--r-md)', border: 'none', cursor: 'pointer',
      background: 'var(--bg-card2)' }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
          <span style={{ fontFamily: FD, fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>{exo.nom}</span>
          {exo.flags.includes('a-encadrer') && (
            <span style={{ padding: '2px 8px', borderRadius: 'var(--r-sm)', background: 'var(--zone-bad-bg)',
              color: 'var(--zone-bad-border)', fontFamily: FB, fontSize: 10, fontWeight: 600 }}>À encadrer</span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-3)', marginTop: 4, fontFamily: FB, fontSize: 11.5, color: 'var(--text-dim)' }}>
          <span>{MODE_LABEL[modePrimaire(exo)]}</span>
          {showGroupe && <span>· {GROUPE_LABEL[exo.groupe]}</span>}
          <span style={{ fontVariantNumeric: 'tabular-nums' }}>· Diff. {exo.difficulteTechnique}/10</span>
          {exo.flags.includes('unilateral') && <span>· Unilatéral</span>}
        </div>
      </div>
      <IconChevronRight size={18} style={{ color: 'var(--text-dim)', flexShrink: 0 }} />
    </button>
  )
}

export function ExercicesMuscu() {
  const [view, setView] = useState<'groupes' | 'list'>('groupes')
  const [groupeLock, setGroupeLock] = useState<Groupe | null>(null)
  const [query, setQuery] = useState('')
  const [exo, setExo] = useState<Exercice | null>(null)
  const [sheet, setSheet] = useState(false)
  const fh = useExerciceFilter()

  const results = useMemo(
    () => appliquerFiltre(EXERCICES_MUSCU, fh.filtre, groupeLock, query),
    [fh.filtre, groupeLock, query],
  )
  // Aperçu live pour le bouton « Voir N » de la sheet (transversal si ouvert depuis Groupes).
  const sheetPreview = useMemo(
    () => appliquerFiltre(EXERCICES_MUSCU, fh.filtre, view === 'list' ? groupeLock : null, query),
    [fh.filtre, groupeLock, query, view],
  )

  if (exo) return <ExerciceFiche exo={exo} onBack={() => setExo(null)} />

  function openGroupe(g: Groupe) { setGroupeLock(g); setView('list') }
  function openTransversal() { setGroupeLock(null); setView('list') }
  function backToGroupes() { setView('groupes'); setGroupeLock(null) }

  return (
    <div>
      {view === 'groupes' ? (
        <>
          <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-5)' }}>
            <SearchBar value={query} onChange={v => { setQuery(v); if (v.trim()) openTransversal() }} />
            <FiltreBtn n={fh.nbActifs} onClick={() => setSheet(true)} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {GROUPE_ORDER.map(g => {
              const n = EXERCICES_MUSCU.filter(e => e.groupe === g).length
              return (
                <button key={g} onClick={() => openGroupe(g)} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
                  width: '100%', textAlign: 'left', padding: 'var(--space-5)', borderRadius: 'var(--r-md)', border: 'none',
                  cursor: 'pointer', background: 'var(--bg-card2)' }}>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--sport-gym)', flexShrink: 0 }} />
                  <span style={{ flex: 1, fontFamily: FD, fontSize: 17, fontWeight: 600, color: 'var(--text)' }}>{GROUPE_LABEL[g]}</span>
                  <span style={{ fontFamily: FB, fontSize: 12, color: 'var(--text-dim)', fontVariantNumeric: 'tabular-nums' }}>{n} exo{n > 1 ? 's' : ''}</span>
                  <IconChevronRight size={18} style={{ color: 'var(--text-dim)' }} />
                </button>
              )
            })}
          </div>
        </>
      ) : (
        <>
          <button onClick={backToGroupes} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none',
            cursor: 'pointer', color: 'var(--text-mid)', fontFamily: FB, fontSize: 13, padding: '4px 0', marginBottom: 'var(--space-4)' }}>
            <IconArrowLeft size={16} /> Groupes
          </button>
          <h2 style={{ fontFamily: FD, fontSize: 24, fontWeight: 600, color: 'var(--text)', margin: '0 0 var(--space-4)' }}>
            {groupeLock ? GROUPE_LABEL[groupeLock] : 'Tous les exercices'}
          </h2>
          <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-4)' }}>
            <SearchBar value={query} onChange={setQuery} />
            <FiltreBtn n={fh.nbActifs} onClick={() => setSheet(true)} />
          </div>
          {(fh.nbActifs > 0 || query.trim()) && (
            <button onClick={() => { fh.reset(); setQuery('') }} style={{ background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--primary)', fontFamily: FB, fontSize: 12.5, padding: '0 0 var(--space-3)' }}>
              Effacer les filtres
            </button>
          )}
          {results.length === 0 ? (
            <div style={{ padding: '48px 24px', borderRadius: 'var(--r-lg)', background: 'var(--bg-card2)', textAlign: 'center' }}>
              <p style={{ fontFamily: FD, fontSize: 17, fontWeight: 600, color: 'var(--text)', margin: '0 0 6px' }}>Aucun exercice ne colle</p>
              <p style={{ fontFamily: FB, fontSize: 13, color: 'var(--text-dim)', margin: 0 }}>Élargis tes filtres ou change de groupe pour explorer la bibliothèque.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              {results.map(e => <ExoCard key={e.id} exo={e} showGroupe={!groupeLock} onClick={() => setExo(e)} />)}
            </div>
          )}
        </>
      )}

      {sheet && (
        <FiltreSheet
          filtre={fh.filtre} nbResultats={sheetPreview.length}
          toggleMode={fh.toggleMode} toggleMuscle={fh.toggleMuscle} toggleEquip={fh.toggleEquip}
          setDifficulteMax={fh.setDifficulteMax} toggleFlag={fh.toggleFlag} reset={fh.reset}
          onClose={() => { setSheet(false); if (fh.nbActifs > 0 && view === 'groupes') openTransversal() }}
        />
      )}
    </div>
  )
}
