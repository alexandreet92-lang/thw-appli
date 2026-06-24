'use client'
// Vélo › Séances : écran BUCKETS (8 bulles d'intention) → LISTE → DÉTAIL.
import { useState, useMemo } from 'react'
import { IconSearch, IconAdjustmentsHorizontal, IconArrowLeft, IconChevronRight } from '@tabler/icons-react'
import {
  SEANCES_VELO, VELO_BUCKET_ORDER, VELO_BUCKET_LABEL, VELO_BUCKET_SUB, SUPPORT_LABEL,
  type Seance, type VeloBucket,
} from '@/data/seances/velo'
import { SlideView } from '@/components/ui/SlideView'
import { VeloProfil } from './VeloProfil'
import { SeanceVeloDetail } from './SeanceVeloDetail'
import { VeloFiltreSheet } from './VeloFiltreSheet'
import { useVeloFilter, appliquerVeloFiltre } from './useVeloFilter'

const FD = 'var(--font-display)', FB = 'var(--font-body)'

function SearchBar({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', padding: '0 12px', height: 42, borderRadius: 'var(--r-sm)', background: 'var(--bg-card2)', flex: 1, minWidth: 0 }}>
      <IconSearch size={17} style={{ color: 'var(--text-dim)', flexShrink: 0 }} />
      <input value={value} onChange={e => onChange(e.target.value)} placeholder="Rechercher une séance…" style={{ flex: 1, minWidth: 0, border: 'none', outline: 'none', background: 'transparent', color: 'var(--text)', fontFamily: FB, fontSize: 13 }} />
    </div>
  )
}
function FiltreBtn({ n, onClick }: { n: number; onClick: () => void }) {
  return (
    <button onClick={onClick} aria-label="Filtrer" style={{ display: 'flex', alignItems: 'center', gap: 6, height: 42, padding: '0 14px', borderRadius: 'var(--r-sm)', border: 'none', cursor: 'pointer', flexShrink: 0, background: n > 0 ? 'var(--primary-dim)' : 'var(--bg-card2)', color: n > 0 ? 'var(--primary)' : 'var(--text-mid)', fontFamily: FB, fontSize: 13, fontWeight: 500 }}>
      <IconAdjustmentsHorizontal size={17} /> Filtrer{n > 0 ? ` · ${n}` : ''}
    </button>
  )
}
function Chip({ children }: { children: React.ReactNode }) {
  return <span style={{ padding: '2px 8px', borderRadius: 'var(--r-sm)', background: 'var(--bg-elev)', color: 'var(--text-dim)', fontFamily: FB, fontSize: 10.5, fontWeight: 600 }}>{children}</span>
}

function SeanceCard({ s, showBucket, onClick }: { s: Seance; showBucket: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', width: '100%', textAlign: 'left', padding: 'var(--space-4)', borderRadius: 'var(--r-md)', border: 'none', cursor: 'pointer', background: 'var(--bg-card2)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', width: '100%' }}>
        <span style={{ flex: 1, minWidth: 0, fontFamily: FD, fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>{s.nom}</span>
        <span style={{ fontFamily: FB, fontSize: 11.5, color: 'var(--text-dim)', fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>{s.dureeMinMin}–{s.dureeMaxMin}′ · RPE {s.rpe}</span>
        <IconChevronRight size={18} style={{ color: 'var(--text-dim)', flexShrink: 0 }} />
      </div>
      <div style={{ height: 38 }}><VeloProfil seance={s} /></div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
        {showBucket && <Chip>{VELO_BUCKET_LABEL[s.bucket]}</Chip>}
        {s.support.map(sp => <Chip key={sp}>{SUPPORT_LABEL[sp]}</Chip>)}
        {s.terrain === 'cote' && <Chip>Côte</Chip>}
        {s.cadenceTag && <Chip>{s.cadenceTag === 'basse' ? 'Cad. basse' : s.cadenceTag === 'haute' ? 'Cad. haute' : 'Cad.'}</Chip>}
      </div>
    </button>
  )
}

export function SeancesVelo() {
  const [view, setView] = useState<'buckets' | 'list'>('buckets')
  const [lock, setLock] = useState<VeloBucket | null>(null)
  const [query, setQuery] = useState('')
  const [detail, setDetail] = useState<Seance | null>(null)
  const [sheet, setSheet] = useState(false)
  const [dir, setDir] = useState(1)
  const vf = useVeloFilter()

  const results = useMemo(() => appliquerVeloFiltre(SEANCES_VELO, vf.filtre, lock, query), [vf.filtre, lock, query])
  const preview = useMemo(() => appliquerVeloFiltre(SEANCES_VELO, vf.filtre, view === 'list' ? lock : null, query), [vf.filtre, lock, query, view])

  function openBucket(b: VeloBucket) { setDir(1); setLock(b); setView('list') }
  function openTransversal() { setDir(1); setLock(null); setView('list') }
  function backToBuckets() { setDir(-1); setView('buckets'); setLock(null) }
  function openDetail(s: Seance) { setDir(1); setDetail(s) }
  function closeDetail() { setDir(-1); setDetail(null) }

  const screenKey = detail ? 'detail' : view

  return (
    <div style={{ overflowX: 'hidden' }}>
      <SlideView screenKey={screenKey} direction={dir}>
      {detail ? (
        <SeanceVeloDetail seance={detail} onBack={closeDetail} />
      ) : view === 'buckets' ? (
        <>
          <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-5)' }}>
            <SearchBar value={query} onChange={v => { setQuery(v); if (v.trim()) openTransversal() }} />
            <FiltreBtn n={vf.nbActifs} onClick={() => setSheet(true)} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {VELO_BUCKET_ORDER.map(b => {
              const n = SEANCES_VELO.filter(s => s.bucket === b).length
              return (
                <button key={b} onClick={() => openBucket(b)} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', width: '100%', textAlign: 'left', padding: 'var(--space-5)', borderRadius: 'var(--r-md)', border: 'none', cursor: 'pointer', background: 'var(--bg-card2)' }}>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--sport-bike)', flexShrink: 0 }} />
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: 'block', fontFamily: FD, fontSize: 17, fontWeight: 600, color: 'var(--text)' }}>{VELO_BUCKET_LABEL[b]}</span>
                    <span style={{ display: 'block', fontFamily: FB, fontSize: 11.5, color: 'var(--text-dim)' }}>{VELO_BUCKET_SUB[b]}</span>
                  </span>
                  <span style={{ fontFamily: FB, fontSize: 12, color: 'var(--text-dim)', fontVariantNumeric: 'tabular-nums' }}>{n}</span>
                  <IconChevronRight size={18} style={{ color: 'var(--text-dim)' }} />
                </button>
              )
            })}
          </div>
        </>
      ) : (
        <>
          <button onClick={backToBuckets} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-mid)', fontFamily: FB, fontSize: 13, padding: '4px 0', marginBottom: 'var(--space-4)' }}>
            <IconArrowLeft size={16} /> Intentions
          </button>
          <h2 style={{ fontFamily: FD, fontSize: 24, fontWeight: 600, color: 'var(--text)', margin: '0 0 var(--space-4)' }}>
            {lock ? VELO_BUCKET_LABEL[lock] : 'Toutes les séances'}
          </h2>
          <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-4)' }}>
            <SearchBar value={query} onChange={setQuery} />
            <FiltreBtn n={vf.nbActifs} onClick={() => setSheet(true)} />
          </div>
          {(vf.nbActifs > 0 || query.trim()) && (
            <button onClick={() => { vf.reset(); setQuery('') }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary)', fontFamily: FB, fontSize: 12.5, padding: '0 0 var(--space-3)' }}>Effacer les filtres</button>
          )}
          {results.length === 0 ? (
            <div style={{ padding: '48px 24px', borderRadius: 'var(--r-lg)', background: 'var(--bg-card2)', textAlign: 'center' }}>
              <p style={{ fontFamily: FD, fontSize: 17, fontWeight: 600, color: 'var(--text)', margin: '0 0 6px' }}>Aucune séance ne colle</p>
              <p style={{ fontFamily: FB, fontSize: 13, color: 'var(--text-dim)', margin: 0 }}>Élargis tes filtres ou change d'intention.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              {results.map(s => <SeanceCard key={s.id} s={s} showBucket={!lock} onClick={() => openDetail(s)} />)}
            </div>
          )}
        </>
      )}
      </SlideView>

      <VeloFiltreSheet open={sheet} filtre={vf.filtre} nbResultats={preview.length}
        toggleZone={vf.toggleZone} toggleCadence={vf.toggleCadence} toggleTerrain={vf.toggleTerrain}
        toggleSupport={vf.toggleSupport} togglePhase={vf.togglePhase} setDureeMax={vf.setDureeMax} setRpeMax={vf.setRpeMax} reset={vf.reset}
        onClose={() => { setSheet(false); if (vf.nbActifs > 0 && view === 'buckets') openTransversal() }} />
    </div>
  )
}
