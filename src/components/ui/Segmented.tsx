'use client'
// Segmented control neutre (DESIGN_SYSTEM.md §2/§3) : piste --bg-card2, segment
// actif élevé sur --bg-elev, inactif --text-dim. Aucun aplat coloré, tokens only.
// Défile horizontalement si la liste est longue (ex. années de records).

export interface SegmentedOption<T extends string> {
  id: T
  label: string
}

interface Props<T extends string> {
  options: SegmentedOption<T>[]
  value: T
  onChange: (id: T) => void
  size?: 'sm' | 'md'
  ariaLabel?: string
}

export function Segmented<T extends string>({ options, value, onChange, size = 'md', ariaLabel }: Props<T>) {
  const padV = size === 'sm' ? 4 : 6
  const padH = size === 'sm' ? 10 : 13
  const font = size === 'sm' ? 11 : 12
  return (
    <div role="tablist" aria-label={ariaLabel}
      style={{
        display: 'inline-flex', gap: 2, padding: 3, maxWidth: '100%', overflowX: 'auto',
        background: 'var(--bg-card2)', borderRadius: 'var(--r-sm)', scrollbarWidth: 'none',
      }}>
      {options.map(o => {
        const on = o.id === value
        return (
          <button key={o.id} role="tab" aria-selected={on} onClick={() => onChange(o.id)}
            style={{
              flexShrink: 0, padding: `${padV}px ${padH}px`, borderRadius: 'calc(var(--r-sm) - 2px)',
              border: 'none', cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'var(--font-body)',
              fontSize: font, fontWeight: on ? 600 : 500,
              background: on ? 'var(--bg-elev)' : 'transparent',
              color: on ? 'var(--text)' : 'var(--text-dim)',
              boxShadow: on ? 'var(--shadow-card)' : 'none',
              transition: 'background 0.15s, color 0.15s',
            }}>
            {o.label}
          </button>
        )
      })}
    </div>
  )
}
