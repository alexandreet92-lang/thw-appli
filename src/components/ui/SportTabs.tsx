'use client'

/**
 * SportTabs — pills horizontaux style Year Datas.
 * Référence visuelle : docs/CHART_EXAMPLES.tsx
 *
 * Active  : background = tab.color, text blanc
 * Inactive: background = var(--bg-card2), text var(--text-dim)
 * Scrollable horizontalement sur mobile (overflow-x auto)
 */

export interface SportTabItem {
  id: string
  label: string
  color: string
}

interface SportTabsProps {
  tabs: SportTabItem[]
  value: string
  onChange: (id: string) => void
  style?: React.CSSProperties
  className?: string
}

export function SportTabs({ tabs, value, onChange, style, className }: SportTabsProps) {
  return (
    <div
      className={className}
      style={{
        display: 'flex',
        gap: 6,
        overflowX: 'auto',
        paddingBottom: 4,
        // Masquer la scrollbar sur webkit sans perdre le scroll
        scrollbarWidth: 'none',
        ...style,
      }}
    >
      {tabs.map(tab => {
        const active = value === tab.id
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            style={{
              padding: '6px 14px',
              borderRadius: 20,
              border: 'none',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              flexShrink: 0,
              fontSize: 12,
              fontWeight: active ? 700 : 500,
              transition: 'background 0.15s, color 0.15s',
              background: active ? tab.color : 'var(--bg-card2)',
              color: active ? '#ffffff' : 'var(--text-dim)',
            }}
          >
            {tab.label}
          </button>
        )
      })}
    </div>
  )
}
