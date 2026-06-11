'use client'

/**
 * SportTabs — pills horizontaux neutres (DESIGN_SYSTEM.md §2/§4.1).
 * La couleur sport est portée par un POINT (7px), jamais par un aplat plein.
 * Active  : fond neutre élevé (--bg-elev), texte --text, point sport.
 * Inactive: fond transparent, texte --text-dim, point sport atténué.
 * Scrollable horizontalement sur mobile (overflow-x auto).
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
              display: 'flex', alignItems: 'center', gap: 7,
              padding: '6px 14px',
              borderRadius: 'var(--r-sm)',
              border: 'none',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              flexShrink: 0,
              fontFamily: 'var(--font-body)',
              fontSize: 12,
              fontWeight: active ? 600 : 500,
              transition: 'background 0.15s, color 0.15s',
              background: active ? 'var(--bg-elev)' : 'transparent',
              color: active ? 'var(--text)' : 'var(--text-dim)',
              boxShadow: active ? 'var(--shadow-card)' : 'none',
            }}
          >
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: tab.color, flexShrink: 0, opacity: active ? 1 : 0.6 }} />
            {tab.label}
          </button>
        )
      })}
    </div>
  )
}
