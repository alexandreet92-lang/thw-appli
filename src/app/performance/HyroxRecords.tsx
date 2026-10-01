'use client'
// Orchestrateur Records/Hyrox (DS) : filtre format (segmented neutre), bouton
// « + Ajouter une course » (lien cyan), comparaison (HyroxCompare) + feuille (HyroxRaceSheet).
import { useEffect, useState } from 'react'
import { useI18n } from '@/lib/i18n'
import { Segmented } from '@/components/ui/Segmented'
import { HyroxCompare } from './HyroxCompare'
import { HyroxRaceSheet } from './HyroxRaceSheet'
import { fetchRaces, deleteRace, HYROX_FORMAT_LABELS, type HyroxRace } from './hyroxShared'
import { MCard, MetaSelect, MEmpty, MPrimary, M_ICONS } from './mobile/kit'

type FilterFmt = 'all' | keyof typeof HYROX_FORMAT_LABELS

export function HyroxRecords({ onSelect, mobile }: { onSelect?: (label: string, value: string) => void; mobile?: boolean }) {
  const { t } = useI18n()
  const [races, setRaces] = useState<HyroxRace[] | null>(null)
  const [fmt, setFmt] = useState<FilterFmt>('all')
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState<HyroxRace | null>(null)

  useEffect(() => { void fetchRaces().then(setRaces) }, [])

  const filtered = (races ?? []).filter(r => fmt === 'all' || r.format === fmt)

  const fmtOptions: { id: FilterFmt; label: string }[] = [
    { id: 'all', label: t('performance.all') },
    ...(Object.keys(HYROX_FORMAT_LABELS) as (keyof typeof HYROX_FORMAT_LABELS)[]).map(f => ({ id: f as FilterFmt, label: HYROX_FORMAT_LABELS[f] })),
  ]

  const sheets = (
    <>
      {editing && <HyroxRaceSheet initial={editing} onClose={() => setEditing(null)} onSaved={r => setRaces(prev => (prev ?? []).map(x => x.id === r.id ? r : x).sort((a, b) => b.date.localeCompare(a.date)))} />}
      {adding && <HyroxRaceSheet onClose={() => setAdding(false)} onSaved={r => setRaces(prev => [r, ...(prev ?? [])])} />}
    </>
  )
  const onDelete = (r: HyroxRace) => { void deleteRace(r.id).then(ok => { if (ok) setRaces(prev => (prev ?? []).filter(x => x.id !== r.id)) }) }

  if (mobile) {
    const fmtMeta = <MetaSelect ariaLabel="Format" value={fmt} onChange={setFmt} options={fmtOptions} />
    return (
      <>
        {races === null ? (
          <MCard icon={M_ICONS.trophy} title={t('performance.races')}><div className="dash-skel" style={{ height: 180, borderRadius: 'var(--r-md)', background: 'var(--dash-soft, var(--bg-card2))' }} /></MCard>
        ) : filtered.length === 0 ? (
          <MCard icon={M_ICONS.trophy} title={t('performance.races')} meta={fmtMeta}>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: 17, fontWeight: 700, color: 'var(--text)', margin: '0 0 6px' }}>{t('performance.noRace')}</p>
            <MEmpty>{t('performance.noRaceDesc')}</MEmpty>
          </MCard>
        ) : (
          <HyroxCompare races={filtered} onSelect={onSelect} onEdit={r => setEditing(r)} onDelete={onDelete} mobile headerMeta={fmtMeta} />
        )}
        <MPrimary onClick={() => setAdding(true)}>+ {t('perfm.addHyroxRace')}</MPrimary>
        {sheets}
      </>
    )
  }

  const card: React.CSSProperties = { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', padding: 20 }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Barre : format + ajouter */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <Segmented size="sm" ariaLabel="Format" value={fmt} onChange={setFmt} options={fmtOptions} />
        <button onClick={() => setAdding(true)} style={{ padding: 0, border: 'none', background: 'transparent', color: 'var(--primary)', fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
          + {t('performance.addRace')}
        </button>
      </div>

      {races === null ? (
        <div style={card}><p style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--text-dim)', margin: 0 }}>{t('performance.loading')}</p></div>
      ) : filtered.length === 0 ? (
        <div style={card}>
          <p style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 500, color: 'var(--text)', margin: 0 }}>{t('performance.noRace')}</p>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--text-mid)', margin: '6px 0 0' }}>
            {t('performance.noRaceDesc')}
          </p>
        </div>
      ) : (
        <HyroxCompare races={filtered} onSelect={onSelect}
          onEdit={r => setEditing(r)}
          onDelete={onDelete} />
      )}

      {sheets}
    </div>
  )
}
