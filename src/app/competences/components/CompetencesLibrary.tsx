'use client'

import type { CompetenceWithUserState } from '@/types/competences'
import CompetenceCard from './CompetenceCard'
import type { CompetenceTab } from '../constants'

interface Props {
  competences: CompetenceWithUserState[]
  activeTab: CompetenceTab
  onTabChange: (t: CompetenceTab) => void
  conflictsFor: (c: CompetenceWithUserState) => CompetenceWithUserState[]
  onToggle: (c: CompetenceWithUserState) => void
  onOpenDetail: (c: CompetenceWithUserState) => void
  loading: boolean
}

const TABS: { id: CompetenceTab; label: string }[] = [
  { id: 'toutes', label: 'Toutes' },
  { id: 'actives', label: 'Actives' },
  { id: 'miennes', label: 'Miennes' },
]

export default function CompetencesLibrary({ competences, activeTab, onTabChange, conflictsFor, onToggle, onOpenDetail, loading }: Props) {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', borderRight: '0.5px solid var(--border)', overflow: 'hidden', minWidth: 0 }}>
      {/* Header colonne */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px 8px', flexShrink: 0 }}>
        <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>Bibliothèque</span>
        <div style={{ display: 'flex', gap: 5 }}>
          {TABS.map(t => {
            const a = activeTab === t.id
            return (
              <button
                key={t.id}
                onClick={() => onTabChange(t.id)}
                style={{
                  fontSize: 11, padding: '4px 10px', borderRadius: 6,
                  border: '0.5px solid var(--border)', cursor: 'pointer',
                  background: a ? 'var(--bg-hover)' : 'transparent',
                  color: a ? 'var(--text)' : 'var(--text-dim)',
                  fontFamily: 'DM Sans, sans-serif',
                }}
              >
                {t.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Liste */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '4px 14px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {loading ? (
          <p style={{ fontSize: 12, color: 'var(--text-dim)', padding: '20px 4px' }}>Chargement…</p>
        ) : competences.length === 0 ? (
          <p style={{ fontSize: 12, color: 'var(--text-dim)', padding: '20px 4px' }}>Aucune compétence dans ce filtre.</p>
        ) : (
          competences.map(c => (
            <CompetenceCard
              key={c.id}
              competence={c}
              conflicts={conflictsFor(c)}
              onToggle={() => onToggle(c)}
              onOpenDetail={() => onOpenDetail(c)}
            />
          ))
        )}
      </div>
    </div>
  )
}
