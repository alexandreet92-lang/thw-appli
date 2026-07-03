'use client'
// Muscu › Exercices : écran GROUPES (5 bulles) → LISTE filtrable → FICHE.
// Modèle familles/variantes : une carte = une famille (N variantes).
import { useState, useMemo } from 'react'
import { IconSearch, IconAdjustmentsHorizontal, IconArrowLeft, IconChevronRight } from '@tabler/icons-react'
import {
  FAMILLES_MUSCU, GROUPE_ORDER, GROUPE_LABEL, GROUPE_SUBTITLE, MODE_LABEL,
  primaryMode, type FamilleExercice, type Groupe,
} from '@/data/exercices'
import { useI18n } from '@/lib/i18n'
import { SlideView } from '@/components/ui/SlideView'
import { CategoryPanel, CategoryRow } from './CategoryRow'
import { SPORT_THEME } from './sportTheme'
import { useExerciceFilter, appliquerFiltre } from './useExerciceFilter'
import { FiltreSheet } from './FiltreSheet'
import { FamilleFiche } from './ExerciceFiche'

const FD = 'var(--font-display)', FB = 'var(--font-body)'
const TH = SPORT_THEME.muscu

function SearchBar({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { t } = useI18n()
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', padding: '0 12px', height: 42,
      borderRadius: 'var(--r-sm)', background: 'var(--bg-card2)', flex: 1, minWidth: 0 }}>
      <IconSearch size={17} style={{ color: 'var(--text-dim)', flexShrink: 0 }} />
      <input value={value} onChange={e => onChange(e.target.value)} placeholder={t('session.rechercherExercice')}
        style={{ flex: 1, minWidth: 0, border: 'none', outline: 'none', background: 'transparent', color: 'var(--text)',
          fontFamily: FB, fontSize: 13 }} />
    </div>
  )
}

function FiltreBtn({ n, onClick }: { n: number; onClick: () => void }) {
  const { t } = useI18n()
  return (
    <button onClick={onClick} aria-label={t('session.filtrer')} style={{ display: 'flex', alignItems: 'center', gap: 6, height: 42,
      padding: '0 14px', borderRadius: 'var(--r-sm)', border: 'none', cursor: 'pointer', flexShrink: 0,
      background: n > 0 ? 'var(--primary-dim)' : 'var(--bg-card2)', color: n > 0 ? 'var(--primary)' : 'var(--text-mid)',
      fontFamily: FB, fontSize: 13, fontWeight: 500 }}>
      <IconAdjustmentsHorizontal size={17} /> {t('session.filtrer')}{n > 0 ? ` · ${n}` : ''}
    </button>
  )
}

function FamilleCard({ fam, showGroupe, onClick }: { fam: FamilleExercice; showGroupe: boolean; onClick: () => void }) {
  const { t } = useI18n()
  const nbVar = fam.variantes.length
  return (
    <button onClick={onClick} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', width: '100%',
      textAlign: 'left', padding: 'var(--space-4)', borderRadius: 'var(--r-md)', border: 'none', cursor: 'pointer',
      background: 'var(--bg-card2)' }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
          <span style={{ fontFamily: FD, fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>{fam.nom}</span>
          {fam.flags.includes('a-encadrer') && (
            <span style={{ padding: '2px 8px', borderRadius: 'var(--r-sm)', background: 'var(--zone-bad-bg)',
              color: 'var(--zone-bad-border)', fontFamily: FB, fontSize: 10, fontWeight: 600 }}>{t('session.aEncadrer')}</span>
          )}
          {fam.accessoire && (
            <span style={{ padding: '2px 8px', borderRadius: 'var(--r-sm)', background: 'var(--bg-elev)',
              color: 'var(--text-dim)', fontFamily: FB, fontSize: 10, fontWeight: 600 }}>{t('session.accessoire')}</span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-3)', marginTop: 4, fontFamily: FB, fontSize: 11.5, color: 'var(--text-dim)', flexWrap: 'wrap' }}>
          <span>{MODE_LABEL[primaryMode(fam.modes)]}</span>
          {showGroupe && <span>· {GROUPE_LABEL[fam.groupe]}</span>}
          <span style={{ fontVariantNumeric: 'tabular-nums' }}>· {t('session.diffSlash', { n: fam.difficulteTechnique })}</span>
          {nbVar > 0 && <span style={{ fontVariantNumeric: 'tabular-nums' }}>· {t('session.nVariantes', { n: nbVar, s: nbVar > 1 ? 's' : '' })}</span>}
        </div>
      </div>
      <IconChevronRight size={18} style={{ color: 'var(--text-dim)', flexShrink: 0 }} />
    </button>
  )
}

export function ExercicesMuscu() {
  const { t } = useI18n()
  const [view, setView] = useState<'groupes' | 'list'>('groupes')
  const [groupeLock, setGroupeLock] = useState<Groupe | null>(null)
  const [query, setQuery] = useState('')
  const [fiche, setFiche] = useState<FamilleExercice | null>(null)
  const [sheet, setSheet] = useState(false)
  const [dir, setDir] = useState(1)
  const fh = useExerciceFilter()

  const results = useMemo(
    () => appliquerFiltre(FAMILLES_MUSCU, fh.filtre, groupeLock, query),
    [fh.filtre, groupeLock, query],
  )
  const sheetPreview = useMemo(
    () => appliquerFiltre(FAMILLES_MUSCU, fh.filtre, view === 'list' ? groupeLock : null, query),
    [fh.filtre, groupeLock, query, view],
  )

  function openGroupe(g: Groupe) { setDir(1); setGroupeLock(g); setView('list') }
  function openTransversal() { setDir(1); setGroupeLock(null); setView('list') }
  function backToGroupes() { setDir(-1); setView('groupes'); setGroupeLock(null) }
  function openFiche(f: FamilleExercice) { setDir(1); setFiche(f) }
  function closeFiche() { setDir(-1); setFiche(null) }

  const screenKey = fiche ? 'fiche' : view

  return (
    <div style={{ overflowX: 'hidden' }}>
      <SlideView screenKey={screenKey} direction={dir}>
      {fiche ? (
        <FamilleFiche famille={fiche} onBack={closeFiche} />
      ) : view === 'groupes' ? (
        <div style={{ maxWidth: 760, margin: '0 auto' }}>
          <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-5)' }}>
            <SearchBar value={query} onChange={v => { setQuery(v); if (v.trim()) openTransversal() }} />
            <FiltreBtn n={fh.nbActifs} onClick={() => setSheet(true)} />
          </div>
          <CategoryPanel>
            {GROUPE_ORDER.map(g => (
              <CategoryRow key={g} icon={TH.icon} accent={TH.accent} soft={TH.soft}
                name={GROUPE_LABEL[g]} subtitle={GROUPE_SUBTITLE[g]}
                count={FAMILLES_MUSCU.filter(f => f.groupe === g).length} onClick={() => openGroupe(g)} />
            ))}
          </CategoryPanel>
        </div>
      ) : (
        <>
          <button onClick={backToGroupes} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none',
            cursor: 'pointer', color: 'var(--text-mid)', fontFamily: FB, fontSize: 13, padding: '4px 0', marginBottom: 'var(--space-4)' }}>
            <IconArrowLeft size={16} /> {t('session.groupes')}
          </button>
          <h2 style={{ fontFamily: FD, fontSize: 24, fontWeight: 600, color: 'var(--text)', margin: '0 0 var(--space-4)' }}>
            {groupeLock ? GROUPE_LABEL[groupeLock] : t('session.tousExercices')}
          </h2>
          <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-4)' }}>
            <SearchBar value={query} onChange={setQuery} />
            <FiltreBtn n={fh.nbActifs} onClick={() => setSheet(true)} />
          </div>
          {(fh.nbActifs > 0 || query.trim()) && (
            <button onClick={() => { fh.reset(); setQuery('') }} style={{ background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--primary)', fontFamily: FB, fontSize: 12.5, padding: '0 0 var(--space-3)' }}>
              {t('session.effacerFiltres')}
            </button>
          )}
          {results.length === 0 ? (
            <div style={{ padding: '48px 24px', borderRadius: 'var(--r-lg)', background: 'var(--bg-card2)', textAlign: 'center' }}>
              <p style={{ fontFamily: FD, fontSize: 17, fontWeight: 600, color: 'var(--text)', margin: '0 0 6px' }}>{t('session.aucunExerciceColle')}</p>
              <p style={{ fontFamily: FB, fontSize: 13, color: 'var(--text-dim)', margin: 0 }}>{t('session.elargisGroupe')}</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              {results.map(f => <FamilleCard key={f.id} fam={f} showGroupe={!groupeLock} onClick={() => openFiche(f)} />)}
            </div>
          )}
        </>
      )}
      </SlideView>

      <FiltreSheet
        open={sheet}
        filtre={fh.filtre} nbResultats={sheetPreview.length}
        toggleMode={fh.toggleMode} toggleMuscle={fh.toggleMuscle} toggleEquip={fh.toggleEquip}
        setDifficulteMax={fh.setDifficulteMax} toggleFlag={fh.toggleFlag} reset={fh.reset}
        onClose={() => { setSheet(false); if (fh.nbActifs > 0 && view === 'groupes') openTransversal() }}
      />
    </div>
  )
}
