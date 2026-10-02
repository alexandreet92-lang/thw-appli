'use client'
// Liste de catégories de la Bibliothèque : panneau centré (max ~760px) +
// lignes. Chip icône dans la couleur du sport, nom serif, sous-titre optionnel,
// pastille de comptage (issue des données), chevron. Hover/focus visibles.
import { IconChevronRight, type Icon } from '@tabler/icons-react'
import { useSessionMobile, MList, MRule, S_CARD } from '../mobile/kit'

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
  const mobile = useSessionMobile()
  // Mobile : liste groupée blanche radius 20 (les lignes posent leur filet).
  if (mobile) return <MList><style>{'.lib-mrow:first-of-type>span[aria-hidden]:first-child{display:none}'}</style>{children}</MList>
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
  const mobile = useSessionMobile()
  if (mobile) {
    // Mobile : tuile icône teintée · nom 16/600 + sous-titre gris · compteur gris · chevron.
    return (
      <button type="button" onClick={onClick} className="thw-press lib-mrow"
        style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 12, width: '100%', minHeight: 64, textAlign: 'left',
          padding: '10px 16px', background: S_CARD, border: 'none', cursor: 'pointer', fontFamily: FB }}>
        <MRule />
        <span style={{ width: 40, height: 40, borderRadius: 'var(--r-md)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: soft, color: accent, flexShrink: 0 }}>
          <Ic size={22} />
        </span>
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: 'block', fontSize: 16, fontWeight: 600, color: 'var(--text)', lineHeight: 1.3 }}>{name}</span>
          {subtitle && <span style={{ display: 'block', marginTop: 1, fontSize: 13, color: 'var(--text-mid)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{subtitle}</span>}
        </span>
        <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-mid)', fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>{count}</span>
        <IconChevronRight size={18} style={{ color: 'var(--text-dim)', flexShrink: 0 }} />
      </button>
    )
  }
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
      <span style={{ minWidth: 26, height: 22, padding: '0 8px', borderRadius: 'var(--r-pill)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        background: soft, color: accent, fontFamily: FB, fontSize: 12, fontWeight: 700, fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>
        {count}
      </span>
      <IconChevronRight size={18} className="lib-rowchev" style={{ color: 'var(--text-dim)', flexShrink: 0 }} />
    </button>
  )
}
