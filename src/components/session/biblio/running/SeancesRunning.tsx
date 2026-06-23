'use client'
// Running › Séances : écran BUCKETS (5 bulles) → LISTE filtrable → DÉTAIL.
import { useState, useMemo } from 'react'
import { IconSearch, IconAdjustmentsHorizontal, IconArrowLeft, IconChevronRight } from '@tabler/icons-react'
import {
  SEANCES_RUNNING, BUCKET_ORDER, BUCKET_LABEL, BUCKET_SHORT, FILIERE_LABEL,
  type Seance, type RunBucket,
} from '@/data/seances/running'
import { SlideView } from '@/components/ui/SlideView'
import { RunProfil } from './RunProfil'
import { SeanceDetail } from './SeanceDetail'
import { RunFiltreSheet } from './RunFiltreSheet'
import { useRunFilter, appliquerRunFiltre } from './useRunFilter'

const FD = 'var(--font-display)', FB = 'var(--font-body)'

function SearchBar({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', padding: '0 12px', height: 42,
      borderRadius: 'var(--r-sm)', background: 'var(--bg-card2)', flex: 1, minWidth: 0 }}>
      <IconSearch size={17} style={{ color: 'var(--text-dim)', flexShrink: 0 }} />
      <input value={value} onChange={e => onChange(e.target.value)} placeholder="Rechercher une séance…"
        style={{ flex: 1, minWidth: 0, border: 'none', outline: 'none', background: 'transparent', color: 'var(--text)', fontFamily: FB, fontSize: 13 }} />
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
function Chip({ children }: { children: React.ReactNode }) {
  return <span style={{ padding: '2px 8px', borderRadius: 'var(--r-sm)', background: 'var(--bg-elev)', color: 'var(--text-dim)', fontFamily: FB, fontSize: 10.5, fontWeight: 600 }}>{children}</span>
}

function SeanceCard({ s, showBucket, onClick }: { s: Seance; showBucket: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', width: '100%',
      textAlign: 'left', padding: 'var(--space-4)', borderRadius: 'var(--r-md)', border: 'none', cursor: 'pointer', background: 'var(--bg-card2)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', width: '100%' }}>
        <span style={{ flex: 1, minWidth: 0, fontFamily: FD, fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>{s.nom}</span>
        <span style={{ fontFamily: FB, fontSize: 11.5, color: 'var(--text-dim)', fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>{s.dureeEstimeeMin}′ · RPE {s.rpe}</span>
        <IconChevronRight size={18} style={{ color: 'var(--text-dim)', flexShrink: 0 }} />
      </div>
      <div style={{ height: 38 }}><RunProfil seance={s} /></div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
        <Chip>{FILIERE_LABEL[s.filiere]}</Chip>
        <Chip>{s.phase}</Chip>
        {showBucket && <Chip>{BUCKET_SHORT[s.bucket]}</Chip>}
      </div>
    </button>
  )
}

export function SeancesRunning() {
  const [view, setView] = useState<'buckets' | 'list'>('buckets')
  const [lock, setLock] = useState<RunBucket | null>(null)
  const [query, setQuery] = useState('')
  const [detail, setDetail] = useState<Seance | null>(null)
  const [sheet, setSheet] = useState(false)
  const [dir, setDir] = useState(1)
  const rf = useRunFilter()

  const results = useMemo(() => appliquerRunFiltre(SEANCES_RUNNING, rf.filtre, lock, query), [rf.filtre, lock, query])
  const preview = useMemo(() => appliquerRunFiltre(SEANCES_RUNNING, rf.filtre, view === 'list' ? lock : null, query), [rf.filtre, lock, query, view])

  function openBucket(b: RunBucket) { setDir(1); setLock(b); setView('list') }
  function openTransversal() { setDir(1); setLock(null); setView('list') }
  function backToBuckets() { setDir(-1); setView('buckets'); setLock(null) }
  function openDetail(s: Seance) { setDir(1); setDetail(s) }
  function closeDetail() { setDir(-1); setDetail(null) }

  const screenKey = detail ? 'detail' : view

  return (
    <div style={{ overflowX: 'hidden' }}>
      <SlideView screenKey={screenKey} direction={dir}>
      {detail ? (
        <SeanceDetail seance={detail} onBack={closeDetail} />
      ) : view === 'buckets' ? (
        <>
          <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-5)' }}>
            <SearchBar value={query} onChange={v => { setQuery(v); if (v.trim()) openTransversal() }} />
            <FiltreBtn n={rf.nbActifs} onClick={() => setSheet(true)} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {BUCKET_ORDER.map(b => {
              const n = SEANCES_RUNNING.filter(s => s.bucket === b).length
              return (
                <button key={b} onClick={() => openBucket(b)} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
                  width: '100%', textAlign: 'left', padding: 'var(--space-5)', borderRadius: 'var(--r-md)', border: 'none', cursor: 'pointer', background: 'var(--bg-card2)' }}>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--sport-run)', flexShrink: 0 }} />
                  <span style={{ flex: 1, fontFamily: FD, fontSize: 17, fontWeight: 600, color: 'var(--text)' }}>{BUCKET_LABEL[b]}</span>
                  <span style={{ fontFamily: FB, fontSize: 12, color: 'var(--text-dim)', fontVariantNumeric: 'tabular-nums' }}>{n} séance{n > 1 ? 's' : ''}</span>
                  <IconChevronRight size={18} style={{ color: 'var(--text-dim)' }} />
                </button>
              )
            })}
          </div>
        </>
      ) : (
        <>
          <button onClick={backToBuckets} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none',
            cursor: 'pointer', color: 'var(--text-mid)', fontFamily: FB, fontSize: 13, padding: '4px 0', marginBottom: 'var(--space-4)' }}>
            <IconArrowLeft size={16} /> Distances
          </button>
          <h2 style={{ fontFamily: FD, fontSize: 24, fontWeight: 600, color: 'var(--text)', margin: '0 0 var(--space-4)' }}>
            {lock ? BUCKET_LABEL[lock] : 'Toutes les séances'}
          </h2>
          <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-4)' }}>
            <SearchBar value={query} onChange={setQuery} />
            <FiltreBtn n={rf.nbActifs} onClick={() => setSheet(true)} />
          </div>
          {(rf.nbActifs > 0 || query.trim()) && (
            <button onClick={() => { rf.reset(); setQuery('') }} style={{ background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--primary)', fontFamily: FB, fontSize: 12.5, padding: '0 0 var(--space-3)' }}>Effacer les filtres</button>
          )}
          {results.length === 0 ? (
            <div style={{ padding: '48px 24px', borderRadius: 'var(--r-lg)', background: 'var(--bg-card2)', textAlign: 'center' }}>
              <p style={{ fontFamily: FD, fontSize: 17, fontWeight: 600, color: 'var(--text)', margin: '0 0 6px' }}>Aucune séance ne colle</p>
              <p style={{ fontFamily: FB, fontSize: 13, color: 'var(--text-dim)', margin: 0 }}>Élargis tes filtres ou change de distance.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              {results.map(s => <SeanceCard key={s.id} s={s} showBucket={!lock} onClick={() => openDetail(s)} />)}
            </div>
          )}
        </>
      )}
      </SlideView>

      <RunFiltreSheet open={sheet} filtre={rf.filtre} nbResultats={preview.length}
        toggleFiliere={rf.toggleFiliere} toggleDistance={rf.toggleDistance} togglePhase={rf.togglePhase}
        setDureeMax={rf.setDureeMax} setRpeMax={rf.setRpeMax} reset={rf.reset}
        onClose={() => { setSheet(false); if (rf.nbActifs > 0 && view === 'buckets') openTransversal() }} />
    </div>
  )
}
