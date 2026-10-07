// CADENCES · G3 — 7 mini-anneaux, un par qualité. SVG brut.
// Anneau rempli à pct / 1.1 (Extraterrestre = plein). Centre : % ; dessous : libellé + niveau.
import { levelColor } from '@/lib/cadences/palette'

export interface QualityItem { key: string; label: string; pct: number; level: string }

export function QualityRings({ items }: { items: QualityItem[] }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(96px, 1fr))', gap: 'var(--space-4)' }}>
      {items.map((q) => <Ring key={q.key} q={q} />)}
    </div>
  )
}

function Ring({ q }: { q: QualityItem }) {
  const size = 72
  const r = size / 2 - 6
  const c = 2 * Math.PI * r
  const frac = Math.max(0, Math.min(1, q.pct / 1.1))
  const col = levelColor(q.level)
  const cx = size / 2
  return (
    <div style={{ display: 'grid', placeItems: 'center', gap: 4, textAlign: 'center' }}>
      <div style={{ position: 'relative', width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`${q.label} : ${Math.round(q.pct * 100)} %, ${q.level}`}>
          <circle cx={cx} cy={cx} r={r} fill="none" stroke="var(--border)" strokeWidth={6} />
          <circle cx={cx} cy={cx} r={r} fill="none" stroke={col} strokeWidth={6} strokeLinecap="round"
            strokeDasharray={`${c * frac} ${c}`} transform={`rotate(-90 ${cx} ${cx})`} />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center' }}>
          <span style={{ fontFamily: 'var(--font-body)', fontVariantNumeric: 'tabular-nums', fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>
            {Math.round(q.pct * 100)}%
          </span>
        </div>
      </div>
      <span style={{ fontFamily: 'var(--font-body)', fontSize: 11.5, fontWeight: 600, color: 'var(--text)', lineHeight: 1.2 }}>{q.label}</span>
      <span style={{ fontFamily: 'var(--font-body)', fontSize: 10.5, color: 'var(--text-dim)' }}>{q.level}</span>
    </div>
  )
}
