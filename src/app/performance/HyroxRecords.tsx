'use client'
// Orchestrateur Records/Hyrox (DS) : filtre format (segmented neutre), bouton
// « + Ajouter une course » (lien cyan), comparaison (HyroxCompare) + feuille (HyroxRaceSheet).
import { useEffect, useState } from 'react'
import { Segmented } from '@/components/ui/Segmented'
import { HyroxCompare } from './HyroxCompare'
import { HyroxRaceSheet } from './HyroxRaceSheet'
import { fetchRaces, HYROX_FORMAT_LABELS, type HyroxRace } from './hyroxShared'

type FilterFmt = 'all' | keyof typeof HYROX_FORMAT_LABELS

export function HyroxRecords({ onSelect }: { onSelect?: (label: string, value: string) => void }) {
  const [races, setRaces] = useState<HyroxRace[] | null>(null)
  const [fmt, setFmt] = useState<FilterFmt>('all')
  const [adding, setAdding] = useState(false)

  useEffect(() => { void fetchRaces().then(setRaces) }, [])

  const filtered = (races ?? []).filter(r => fmt === 'all' || r.format === fmt)

  const fmtOptions: { id: FilterFmt; label: string }[] = [
    { id: 'all', label: 'Tous' },
    ...(Object.keys(HYROX_FORMAT_LABELS) as (keyof typeof HYROX_FORMAT_LABELS)[]).map(f => ({ id: f as FilterFmt, label: HYROX_FORMAT_LABELS[f] })),
  ]

  const card: React.CSSProperties = { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: 20 }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Barre : format + ajouter */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <Segmented size="sm" ariaLabel="Format" value={fmt} onChange={setFmt} options={fmtOptions} />
        <button onClick={() => setAdding(true)} style={{ padding: 0, border: 'none', background: 'transparent', color: 'var(--primary)', fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
          + Ajouter une course
        </button>
      </div>

      {races === null ? (
        <div style={card}><p style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--text-dim)', margin: 0 }}>Chargement…</p></div>
      ) : filtered.length === 0 ? (
        <div style={card}>
          <p style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 500, color: 'var(--text)', margin: 0 }}>Aucune course</p>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--text-mid)', margin: '6px 0 0' }}>
            Ajoute ta première course Hyrox pour comparer tes temps, stations et runs compromised.
          </p>
        </div>
      ) : (
        <HyroxCompare races={filtered} onSelect={onSelect} />
      )}

      {adding && <HyroxRaceSheet onClose={() => setAdding(false)} onSaved={r => setRaces(prev => [r, ...(prev ?? [])])} />}
    </div>
  )
}
