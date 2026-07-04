'use client'

import type { CategorieCompetence } from '@/types/competences'
import { useI18n } from '@/lib/i18n'
import {
  SPORTS_ORDER, SPORT_LABELS, sportIcon,
  CATEGORIES_ORDER, CATEGORY_LABELS, categoryIcon,
  type SportFilter,
} from '../constants'

interface Props {
  activeSport: SportFilter
  activeCategory: CategorieCompetence | null
  onSelectSport: (s: SportFilter) => void
  onSelectCategory: (c: CategorieCompetence | null) => void
}

const labelStyle: React.CSSProperties = {
  fontSize: 9, fontWeight: 700, letterSpacing: '1.3px',
  textTransform: 'uppercase', color: 'var(--text-dim)',
  margin: '0 0 6px', padding: '0 10px',
}

function Item({ active, icon, label, onClick }: { active: boolean; icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 10, width: '100%',
        padding: '8px 10px', borderRadius: 8, border: 'none', textAlign: 'left',
        cursor: 'pointer', fontSize: 13, fontFamily: 'DM Sans, sans-serif',
        transition: 'background 120ms, color 120ms',
        background: active ? 'rgba(6,182,212,0.10)' : 'transparent',
        color: active ? '#06B6D4' : 'var(--text)',
        fontWeight: active ? 500 : 400,
      }}
      onMouseEnter={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-hover)' }}
      onMouseLeave={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
    >
      <span style={{
        flexShrink: 0, width: 18, height: 18,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: active ? '#06B6D4' : 'var(--text-mid)',
      }}>{icon}</span>
      {label}
    </button>
  )
}

export default function SportSidebar({ activeSport, activeCategory, onSelectSport, onSelectCategory }: Props) {
  const { t } = useI18n()
  return (
    <div>
      <div style={labelStyle}>{t('competences.sports')}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {SPORTS_ORDER.map(s => (
          <Item key={s} active={activeSport === s} icon={sportIcon(s)} label={SPORT_LABELS[s]} onClick={() => onSelectSport(s)} />
        ))}
      </div>

      <div style={{ height: 1, background: 'var(--border)', margin: '14px 10px' }} />

      <div style={{ ...labelStyle, marginTop: 10 }}>{t('competences.categories')}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {CATEGORIES_ORDER.map(c => (
          <Item
            key={c}
            active={activeCategory === c}
            icon={categoryIcon(c)}
            label={CATEGORY_LABELS[c]}
            onClick={() => onSelectCategory(activeCategory === c ? null : c)}
          />
        ))}
      </div>
    </div>
  )
}
