'use client'

// ══════════════════════════════════════════════════════════════════
// NutritionRail — barre latérale gauche DESKTOP des 4 sections
// Nutrition. Reproduit À L'IDENTIQUE le rail de SectionLayout (page
// Planning) : 56 px replié → 220 px au survol, icône + libellé +
// indicateur actif. Pilote l'état `tab` contrôlé de la page Nutrition
// (nécessaire pour les liens croisés type « Relié à Mon plan »).
// ══════════════════════════════════════════════════════════════════

import { useState } from 'react'
import { CalendarDays, ClipboardList, TrendingUp, Scale } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useI18n } from '@/lib/i18n'

export type NutritionTab = 'today' | 'plan' | 'tracking' | 'body'

const CYAN = '#06B6D4'
const RAIL_SECTIONS: { id: NutritionTab; subKey: string; icon: LucideIcon }[] = [
  { id: 'today',    subKey: 'nutrition.rail.todaySub',    icon: CalendarDays },
  { id: 'plan',     subKey: 'nutrition.rail.planSub',     icon: ClipboardList },
  { id: 'tracking', subKey: 'nutrition.rail.trackingSub', icon: TrendingUp },
  { id: 'body',     subKey: 'nutrition.rail.bodySub',     icon: Scale },
]

export function NutritionRail({ tab, onChange }: { tab: NutritionTab; onChange: (t: NutritionTab) => void }) {
  const { t } = useI18n()
  const [railOpen, setRailOpen] = useState(false)
  return (
    <div style={{ width: 56, flexShrink: 0, position: 'relative', alignSelf: 'stretch' }}>
      <aside
        onMouseEnter={() => setRailOpen(true)}
        onMouseLeave={() => setRailOpen(false)}
        style={{
          position: 'sticky', top: 0, left: 0, zIndex: 5,
          width: railOpen ? 220 : 56, overflow: 'hidden',
          background: 'var(--bg)', borderRight: '0.5px solid var(--border)',
          padding: '14px 8px', minHeight: 'calc(100vh - var(--header-height))',
          boxShadow: railOpen ? '8px 0 28px rgba(0,0,0,0.16)' : 'none',
          transition: 'width 200ms cubic-bezier(0.4,0,0.2,1), box-shadow 200ms',
        }}
      >
        {RAIL_SECTIONS.map(s => {
          const active = tab === s.id
          const Icon = s.icon
          return (
            <button key={s.id} onClick={() => onChange(s.id)} title={t(`nutrition.tab.${s.id}`)}
              style={{
                position: 'relative', display: 'flex', alignItems: 'center', gap: 12, width: '100%',
                padding: '11px 11px', borderRadius: 10, marginBottom: 4, cursor: 'pointer',
                border: 'none', textAlign: 'left', fontFamily: 'DM Sans,sans-serif',
                background: active ? 'rgba(6,182,212,0.10)' : 'transparent',
                transition: 'background 0.14s', whiteSpace: 'nowrap',
              }}
              onMouseEnter={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-hover)' }}
              onMouseLeave={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
            >
              {active && <span style={{ position: 'absolute', left: -8, top: 8, bottom: 8, width: 3, borderRadius: '0 3px 3px 0', background: CYAN }} />}
              <Icon size={18} color={active ? CYAN : 'var(--text-mid)'} style={{ flexShrink: 0 }} />
              <span style={{ display: 'flex', flexDirection: 'column', gap: 1, minWidth: 0, opacity: railOpen ? 1 : 0, transition: 'opacity 150ms ease' }}>
                <span style={{ fontSize: 13.5, fontWeight: 600, color: active ? CYAN : 'var(--text)' }}>{t(`nutrition.tab.${s.id}`)}</span>
                <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>{t(s.subKey)}</span>
              </span>
            </button>
          )
        })}
      </aside>
    </div>
  )
}
