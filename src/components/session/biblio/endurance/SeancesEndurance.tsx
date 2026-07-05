'use client'
// Séances d'endurance génériques (Aviron · Natation · Trail) :
// BUCKETS (bulles) → LISTE filtrable → DÉTAIL. Paramétré par EnduranceConfig.
import { useState, useMemo } from 'react'
import { IconSearch, IconAdjustmentsHorizontal, IconArrowLeft, IconChevronRight } from '@tabler/icons-react'
import type { Seance } from '@/data/seances/common'
import { useI18n } from '@/lib/i18n'
import { SlideView } from '@/components/ui/SlideView'
import { CategoryPanel, CategoryRow } from '../CategoryRow'
import { SPORT_THEME } from '../sportTheme'
import { EnduranceProfil } from './EnduranceProfil'
import { SeanceEnduranceDetail } from './SeanceEnduranceDetail'
import { EnduranceFiltreSheet, SUPPORT_LABEL } from './EnduranceFiltreSheet'
import { useEnduranceFilter, appliquerEnduFiltre, optionsDe } from './useEnduranceFilter'
import type { EnduranceConfig } from './config'

const FD = 'var(--font-display)', FB = 'var(--font-body)'

function SearchBar({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', padding: '0 12px', height: 42, borderRadius: 'var(--r-sm)', background: 'var(--bg-card2)', flex: 1, minWidth: 0 }}>
      <IconSearch size={17} style={{ color: 'var(--text-dim)', flexShrink: 0 }} />
      <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={{ flex: 1, minWidth: 0, border: 'none', outline: 'none', background: 'transparent', color: 'var(--text)', fontFamily: FB, fontSize: 13 }} />
    </div>
  )
}
function FiltreBtn({ n, onClick }: { n: number; onClick: () => void }) {
  const { t } = useI18n()
  return (
    <button onClick={onClick} aria-label={t('session.filtrer')} style={{ display: 'flex', alignItems: 'center', gap: 6, height: 42, padding: '0 14px', borderRadius: 'var(--r-sm)', border: 'none', cursor: 'pointer', flexShrink: 0, background: n > 0 ? 'var(--primary-dim)' : 'var(--bg-card2)', color: n > 0 ? 'var(--primary)' : 'var(--text-mid)', fontFamily: FB, fontSize: 13, fontWeight: 500 }}>
      <IconAdjustmentsHorizontal size={17} /> {t('session.filtrer')}{n > 0 ? ` · ${n}` : ''}
    </button>
  )
}
function Chip({ children }: { children: React.ReactNode }) {
  return <span style={{ padding: '2px 8px', borderRadius: 'var(--r-sm)', background: 'var(--bg-elev)', color: 'var(--text-dim)', fontFamily: FB, fontSize: 10.5, fontWeight: 600 }}>{children}</span>
}

function SeanceCard({ s, cfg, showBucket, onClick }: { s: Seance; cfg: EnduranceConfig; showBucket: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', width: '100%', textAlign: 'left', padding: 'var(--space-4)', borderRadius: 'var(--r-md)', border: 'none', cursor: 'pointer', background: 'var(--bg-card2)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', width: '100%' }}>
        <span style={{ flex: 1, minWidth: 0, fontFamily: FD, fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>{s.nom}</span>
        <span style={{ fontFamily: FB, fontSize: 11.5, color: 'var(--text-dim)', fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>{s.dureeMinMin}–{s.dureeMaxMin}′ · RPE {s.rpe}</span>
        <IconChevronRight size={18} style={{ color: 'var(--text-dim)', flexShrink: 0 }} />
      </div>
      <div style={{ height: 38 }}><EnduranceProfil seance={s} ref={cfg.refPace} /></div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
        {showBucket && <Chip>{cfg.bucketLabel[s.bucket] ?? s.bucket}</Chip>}
        {s.support.slice(0, 2).map(sp => <Chip key={sp}>{SUPPORT_LABEL[sp] ?? sp}</Chip>)}
      </div>
    </button>
  )
}

export function SeancesEndurance({ cfg }: { cfg: EnduranceConfig }) {
  const { t } = useI18n()
  const TH = SPORT_THEME[cfg.sport]
  const [view, setView] = useState<'buckets' | 'list'>('buckets')
  const [lock, setLock] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [detail, setDetail] = useState<Seance | null>(null)
  const [sheet, setSheet] = useState(false)
  const [dir, setDir] = useState(1)
  const ef = useEnduranceFilter()
  const options = useMemo(() => optionsDe(cfg.seances), [cfg.seances])

  const results = useMemo(() => appliquerEnduFiltre(cfg.seances, ef.filtre, lock, query), [cfg.seances, ef.filtre, lock, query])
  const preview = useMemo(() => appliquerEnduFiltre(cfg.seances, ef.filtre, view === 'list' ? lock : null, query), [cfg.seances, ef.filtre, lock, query, view])

  function openBucket(b: string) { setDir(1); setLock(b); setView('list') }
  function openTransversal() { setDir(1); setLock(null); setView('list') }
  function backToBuckets() { setDir(-1); setView('buckets'); setLock(null) }
  function openDetail(s: Seance) { setDir(1); setDetail(s) }
  function closeDetail() { setDir(-1); setDetail(null) }

  const screenKey = detail ? 'detail' : view

  return (
    <div style={{ overflowX: 'hidden' }}>
      <SlideView screenKey={screenKey} direction={dir}>
      {detail ? (
        <SeanceEnduranceDetail seance={detail} cfg={cfg} onBack={closeDetail} />
      ) : view === 'buckets' ? (
        <div style={{ maxWidth: 760, margin: '0 auto' }}>
          <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-5)' }}>
            <SearchBar value={query} onChange={v => { setQuery(v); if (v.trim()) openTransversal() }} placeholder={t(cfg.searchPlaceholderKey)} />
            <FiltreBtn n={ef.nbActifs} onClick={() => setSheet(true)} />
          </div>
          <CategoryPanel>
            {cfg.bucketOrder.map(b => (
              <CategoryRow key={b} icon={TH.icon} accent={TH.accent} soft={TH.soft}
                name={cfg.bucketLabel[b] ?? b} subtitle={cfg.bucketSub[b]}
                count={cfg.seances.filter(s => s.bucket === b).length} onClick={() => openBucket(b)} />
            ))}
          </CategoryPanel>
        </div>
      ) : (
        <>
          <button onClick={backToBuckets} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-mid)', fontFamily: FB, fontSize: 13, padding: '4px 0', marginBottom: 'var(--space-4)' }}>
            <IconArrowLeft size={16} /> {t(cfg.backLabelKey)}
          </button>
          <h2 style={{ fontFamily: FD, fontSize: 24, fontWeight: 600, color: 'var(--text)', margin: '0 0 var(--space-4)' }}>
            {lock ? (cfg.bucketLabel[lock] ?? lock) : t('session.toutesLesSeances')}
          </h2>
          <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-4)' }}>
            <SearchBar value={query} onChange={setQuery} placeholder={t(cfg.searchPlaceholderKey)} />
            <FiltreBtn n={ef.nbActifs} onClick={() => setSheet(true)} />
          </div>
          {(ef.nbActifs > 0 || query.trim()) && (
            <button onClick={() => { ef.reset(); setQuery('') }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary)', fontFamily: FB, fontSize: 12.5, padding: '0 0 var(--space-3)' }}>{t('session.effacerFiltres')}</button>
          )}
          {results.length === 0 ? (
            <div style={{ padding: '48px 24px', borderRadius: 'var(--r-lg)', background: 'var(--bg-card2)', textAlign: 'center' }}>
              <p style={{ fontFamily: FD, fontSize: 17, fontWeight: 600, color: 'var(--text)', margin: '0 0 6px' }}>{t('session.aucuneSeanceColle')}</p>
              <p style={{ fontFamily: FB, fontSize: 13, color: 'var(--text-dim)', margin: 0 }}>{t('session.elargisBulle')}</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              {results.map(s => <SeanceCard key={s.id} s={s} cfg={cfg} showBucket={!lock} onClick={() => openDetail(s)} />)}
            </div>
          )}
        </>
      )}
      </SlideView>

      <EnduranceFiltreSheet open={sheet} filtre={ef.filtre} options={options} nbResultats={preview.length}
        toggleZone={ef.toggleZone} toggleSupport={ef.toggleSupport} togglePhase={ef.togglePhase}
        setDureeMax={ef.setDureeMax} setRpeMax={ef.setRpeMax} reset={ef.reset}
        onClose={() => { setSheet(false); if (ef.nbActifs > 0 && view === 'buckets') openTransversal() }} />
    </div>
  )
}
