'use client'

import type { CompetenceWithUserState } from '@/types/competences'
import { useI18n } from '@/lib/i18n'
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

const TABS: { id: CompetenceTab; labelKey: string }[] = [
  { id: 'toutes', labelKey: 'competences.tabToutes' },
  { id: 'actives', labelKey: 'competences.tabActives' },
  { id: 'miennes', labelKey: 'competences.tabMiennes' },
]

export default function CompetencesLibrary({ competences, activeTab, onTabChange, conflictsFor, onToggle, onOpenDetail, loading }: Props) {
  const { t } = useI18n()
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', borderRight: '0.5px solid var(--border)', overflow: 'hidden', minWidth: 0 }}>
      {/* Header colonne */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px 8px', flexShrink: 0 }}>
        <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{t('competences.library')}</span>
        <div style={{ display: 'flex', gap: 5 }}>
          {TABS.map(tab => {
            const a = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                style={{
                  fontSize: 11, padding: '4px 10px', borderRadius: 6,
                  border: '0.5px solid var(--border)', cursor: 'pointer',
                  background: a ? 'var(--bg-hover)' : 'transparent',
                  color: a ? 'var(--text)' : 'var(--text-dim)',
                  fontFamily: 'DM Sans, sans-serif',
                }}
              >
                {t(tab.labelKey)}
              </button>
            )
          })}
        </div>
      </div>

      {/* Liste */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 14px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {loading ? (
          <p style={{ fontSize: 12, color: 'var(--text-dim)', padding: '20px 4px' }}>{t('competences.loading')}</p>
        ) : competences.length === 0 ? (
          <p style={{ fontSize: 12, color: 'var(--text-dim)', padding: '20px 4px' }}>{t('competences.emptyFilter')}</p>
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
