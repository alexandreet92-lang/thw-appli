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

// Mobile « Strava / Claude » : tiroir gris chaud, libellés de section gris en
// casse normale, listes groupées en cartes blanches à filets, coche cyan.
const labelStyle: React.CSSProperties = {
  fontSize: 15, fontWeight: 500, color: 'var(--text-mid)', margin: '22px 16px 8px', fontFamily: 'var(--font-body)',
}

function Group({ children }: { children: React.ReactNode }) {
  return <div style={{ background: 'var(--surface-card)', borderRadius: 'var(--r-lg)', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>{children}</div> // design-allow-color — ombre douce de carte
}

function Item({ active, icon, label, onClick, first }: { active: boolean; icon?: React.ReactNode; label: string; onClick: () => void; first?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      style={{
        position: 'relative', display: 'flex', alignItems: 'center', gap: 12, width: '100%', minHeight: 52,
        padding: '0 16px', border: 'none', textAlign: 'left', background: 'transparent',
        cursor: 'pointer', fontSize: 16, fontFamily: 'var(--font-body)',
        color: 'var(--text)', fontWeight: active ? 700 : 500,
      }}
    >
      {!first && <span aria-hidden style={{ position: 'absolute', top: 0, left: icon ? 48 : 16, right: 16, height: 1, background: 'var(--border)' }} />}
      {icon && <span style={{ flexShrink: 0, display: 'flex', width: 20, justifyContent: 'center', color: active ? 'var(--text)' : 'var(--text-mid)' }}>{icon}</span>}
      <span style={{ flex: 1, minWidth: 0 }}>{label}</span>
      {active && (
        <svg aria-hidden width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M20 6 9 17l-5-5" /></svg>
      )}
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
          position: 'absolute', inset: 0, background: 'var(--scrim)',
          opacity: open ? 1 : 0, transition: 'opacity 280ms', pointerEvents: open ? 'auto' : 'none',
        }}
      />
      {/* Drawer */}
      <div
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        style={{
          position: 'absolute', top: 0, left: 0, bottom: 0, width: 'min(320px, 86vw)',
          background: 'var(--surface-page)', boxShadow: 'var(--shadow-float)', borderRadius: '0 var(--r-lg) var(--r-lg) 0',
          padding: 'calc(16px + env(safe-area-inset-top)) 16px calc(24px + env(safe-area-inset-bottom))', overflowY: 'auto', boxSizing: 'border-box',
          fontFamily: 'var(--font-body)',
          transform: open ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 280ms cubic-bezier(0.4,0,0.2,1)',
        }}
      >
        <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text)', padding: '4px 4px 0' }}>{t('competences.filters')}</div>

        <div style={labelStyle}>{t('competences.sports')}</div>
        <Group>
          {SPORTS_ORDER.map((s, i) => (
            <Item key={s} first={i === 0} active={activeSport === s} icon={sportIcon(s, 18)} label={t(SPORT_LABELS[s])}
              onClick={() => { onSelectSport(s); onClose() }} />
          ))}
        </Group>

        <div style={labelStyle}>{t('competences.categories')}</div>
        <Group>
          {CATEGORIES_ORDER.map((c, i) => (
            <Item key={c} first={i === 0} active={activeCategory === c} icon={categoryIcon(c, 18)} label={t(CATEGORY_LABELS[c])}
              onClick={() => { onSelectCategory(activeCategory === c ? null : c); onClose() }} />
          ))}
        </Group>

        <div style={labelStyle}>{t('competences.display')}</div>
        <Group>
          {TABS.map((tab, i) => (
            <Item key={tab.id} first={i === 0} active={activeTab === tab.id} label={t(tab.labelKey)}
              onClick={() => { onSelectTab(tab.id); onClose() }} />
          ))}
        </Group>
      </div>
    </div>
  )
}
