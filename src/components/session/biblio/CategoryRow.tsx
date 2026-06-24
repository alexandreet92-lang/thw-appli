'use client'
// Liste de catégories de la Bibliothèque : panneau centré (max ~760px) +
// lignes. Chip icône dans la couleur du sport, nom serif, sous-titre optionnel,
// pastille de comptage (issue des données), chevron. Hover/focus visibles.
import { IconChevronRight, type Icon } from '@tabler/icons-react'

const FD = 'var(--font-display)', FB = 'var(--font-body)'

const STYLE = `
.lib-rowlist { max-width: 760px; margin: 0 auto; }
.lib-row { transition: background .14s ease; }
.lib-row:not(:last-child) { border-bottom: 1px solid var(--border); }
.lib-row:hover { background: var(--bg-hover); }
.lib-row:focus-visible { outline: 2px solid var(--primary); outline-offset: -2px; }
.lib-rowchev { transition: transform .14s ease; }
.lib-row:hover .lib-rowchev { transform: translateX(2px); }
@media (prefers-reduced-motion: reduce) {
  .lib-row, .lib-rowchev { transition: none; }
  .lib-row:hover .lib-rowchev { transform: none; }
}
`

export function CategoryPanel({ children }: { children: React.ReactNode }) {
  return (
    <div className="lib-rowlist">
      <style>{STYLE}</style>
      <div style={{ display: 'flex', flexDirection: 'column', borderRadius: 'var(--r-md)', overflow: 'hidden', background: 'var(--bg-card2)' }}>
        {children}
      </div>
    </div>
  )
}

interface RowProps {
  icon: Icon
  accent: string
  soft: string
  name: string
  subtitle?: string
  count: number
  onClick: () => void
}

export function CategoryRow({ icon: Ic, accent, soft, name, subtitle, count, onClick }: RowProps) {
  return (
    <button className="lib-row" onClick={onClick}
      style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', width: '100%', textAlign: 'left',
        padding: '14px 16px', background: 'transparent', border: 'none', cursor: 'pointer' }}>
      <div style={{ width: 40, height: 40, borderRadius: 'var(--r-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: soft, color: accent, flexShrink: 0 }}>
        <Ic size={20} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: FD, fontSize: 15.5, fontWeight: 600, color: 'var(--text)' }}>{name}</div>
        {subtitle && <div style={{ fontFamily: FB, fontSize: 12, color: 'var(--text-dim)', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{subtitle}</div>}
      </div>
      <span style={{ minWidth: 26, height: 22, padding: '0 8px', borderRadius: 999, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        background: soft, color: accent, fontFamily: FB, fontSize: 12, fontWeight: 700, fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>
        {count}
      </span>
      <IconChevronRight size={18} className="lib-rowchev" style={{ color: 'var(--text-dim)', flexShrink: 0 }} />
    </button>
  )
}
