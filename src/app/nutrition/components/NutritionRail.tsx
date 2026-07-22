'use client'

// ══════════════════════════════════════════════════════════════════
// NutritionRail — barre latérale gauche DESKTOP des 4 sections
// Nutrition. Reproduit À L'IDENTIQUE le rail de SectionLayout (page
// Planning) : 56 px replié → 220 px au survol, icône + libellé +
// indicateur actif. Pilote l'état `tab` contrôlé de la page Nutrition
// (nécessaire pour les liens croisés type « Relié à Mon plan »).
// ══════════════════════════════════════════════════════════════════

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
  return (
    // Toujours ouvert, épinglé (sticky) : reste visible quand on descend la page.
    <aside
      style={{
        width: 206, flexShrink: 0, alignSelf: 'flex-start',
        position: 'sticky', top: 0, zIndex: 5,
        maxHeight: 'calc(100vh - var(--header-height))', overflowY: 'auto',
        background: 'var(--bg)', borderRight: '0.5px solid var(--border)',
        padding: '14px 8px',
      }}
    >
      {RAIL_SECTIONS.map(s => {
        const active = tab === s.id
        const Icon = s.icon
        return (
          <button key={s.id} onClick={() => onChange(s.id)} title={t(`nutrition.tab.${s.id}`)}
            style={{
              position: 'relative', display: 'flex', alignItems: 'center', gap: 10, width: '100%',
              padding: '8px 10px', borderRadius: 9, marginBottom: 3, cursor: 'pointer',
              border: 'none', textAlign: 'left', fontFamily: 'DM Sans,sans-serif',
              background: active ? 'rgba(6,182,212,0.10)' : 'transparent',
              transition: 'background 0.14s', whiteSpace: 'nowrap',
            }}
            onMouseEnter={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-hover)' }}
            onMouseLeave={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
          >
            {active && <span style={{ position: 'absolute', left: -8, top: 7, bottom: 7, width: 3, borderRadius: '0 3px 3px 0', background: CYAN }} />}
            <Icon size={16} color={active ? CYAN : 'var(--text-mid)'} style={{ flexShrink: 0 }} />
            <span style={{ display: 'flex', flexDirection: 'column', gap: 1, minWidth: 0 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: active ? CYAN : 'var(--text)', letterSpacing: '-0.01em' }}>{t(`nutrition.tab.${s.id}`)}</span>
              <span style={{ fontSize: 10, color: 'var(--text-dim)' }}>{t(s.subKey)}</span>
            </span>
          </button>
        )
      })}
    </aside>
  )
}
