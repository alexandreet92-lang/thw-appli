'use client'

import { useRef } from 'react'
import type { CategorieCompetence } from '@/types/competences'
import { useI18n } from '@/lib/i18n'
import {
  SPORTS_ORDER, SPORT_LABELS, sportIcon,
  CATEGORIES_ORDER, CATEGORY_LABELS, categoryIcon,
  type SportFilter, type CompetenceTab,
} from '../constants'

interface Props {
  open: boolean
  onClose: () => void
  activeSport: SportFilter
  activeCategory: CategorieCompetence | null
  activeTab: CompetenceTab
  onSelectSport: (s: SportFilter) => void
  onSelectCategory: (c: CategorieCompetence | null) => void
  onSelectTab: (t: CompetenceTab) => void
}

const labelStyle: React.CSSProperties = {
  fontSize: 9, fontWeight: 700, letterSpacing: '1.3px',
  textTransform: 'uppercase', color: 'var(--text-dim)', margin: '14px 0 6px', padding: '0 10px',
}

function Item({ active, icon, label, onClick }: { active: boolean; icon?: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 10, width: '100%',
        padding: '9px 10px', borderRadius: 8, border: 'none', textAlign: 'left',
        cursor: 'pointer', fontSize: 13.5, fontFamily: 'DM Sans, sans-serif',
        background: active ? 'rgba(6,182,212,0.10)' : 'transparent',
        color: active ? '#06B6D4' : 'var(--text-mid)', fontWeight: active ? 500 : 400,
      }}
    >
      {icon && <span style={{ flexShrink: 0, display: 'flex', color: active ? '#06B6D4' : 'var(--text-mid)' }}>{icon}</span>}
      {label}
    </button>
  )
}

const TABS: { id: CompetenceTab; labelKey: string }[] = [
  { id: 'toutes', labelKey: 'competences.tabToutes' },
  { id: 'actives', labelKey: 'competences.tabActives' },
  { id: 'miennes', labelKey: 'competences.tabMiennes' },
]

export default function MobileSidebar(props: Props) {
  const { open, onClose, activeSport, activeCategory, activeTab, onSelectSport, onSelectCategory, onSelectTab } = props
  const { t } = useI18n()
  const touchStartX = useRef<number | null>(null)

  function handleTouchStart(e: React.TouchEvent) { touchStartX.current = e.touches[0].clientX }
  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null) return
    const dx = e.changedTouches[0].clientX - touchStartX.current
    if (dx < -50) onClose()   // swipe gauche → fermer
    touchStartX.current = null
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 60,
        pointerEvents: open ? 'auto' : 'none',
      }}
      aria-hidden={!open}
    >
      {/* Overlay */}
      <div
        onClick={onClose}
        style={{
          position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)',
          opacity: open ? 1 : 0, transition: 'opacity 280ms', pointerEvents: open ? 'auto' : 'none',
        }}
      />
      {/* Drawer */}
      <div
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        style={{
          position: 'absolute', top: 0, left: 0, bottom: 0, width: 280,
          background: 'var(--bg)', borderRight: '0.5px solid var(--border)',
          padding: '18px 12px', overflowY: 'auto',
          transform: open ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 280ms cubic-bezier(0.4,0,0.2,1)',
        }}
      >
        <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)', padding: '0 10px 6px' }}>{t('competences.filters')}</div>

        <div style={labelStyle}>{t('competences.sports')}</div>
        {SPORTS_ORDER.map(s => (
          <Item key={s} active={activeSport === s} icon={sportIcon(s)} label={SPORT_LABELS[s]}
            onClick={() => { onSelectSport(s); onClose() }} />
        ))}

        <div style={labelStyle}>{t('competences.categories')}</div>
        {CATEGORIES_ORDER.map(c => (
          <Item key={c} active={activeCategory === c} icon={categoryIcon(c)} label={CATEGORY_LABELS[c]}
            onClick={() => { onSelectCategory(activeCategory === c ? null : c); onClose() }} />
        ))}

        <div style={labelStyle}>{t('competences.display')}</div>
        {TABS.map(tab => (
          <Item key={tab.id} active={activeTab === tab.id} label={t(tab.labelKey)}
            onClick={() => { onSelectTab(tab.id); onClose() }} />
        ))}
      </div>
    </div>
  )
}
