// CADENCES · G1 — donut du score global. SVG brut (pas de lib de chart).
// Anneau = total / 1000 ; au-delà de 1000, anneau plein + badge « +X ».
import { levelColor } from '@/lib/cadences/palette'

export function ScoreDonut({ total, level, size = 200 }: { total: number; level: string; size?: number }) {
  const r = size / 2 - 14
  const c = 2 * Math.PI * r
  const frac = Math.max(0, Math.min(1, total / 1000))
  const depasse = Math.max(0, Math.round(total - 1000))
  const col = levelColor(level)
  const cx = size / 2

  return (
    <div style={{ display: 'grid', placeItems: 'center', gap: 'var(--space-2)' }}>
      <div style={{ position: 'relative', width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img"
          aria-label={`Score ${Math.round(total)} sur 1000, niveau ${level}`}>
          <circle cx={cx} cy={cx} r={r} fill="none" stroke="var(--border)" strokeWidth={12} />
          <circle cx={cx} cy={cx} r={r} fill="none" stroke={col} strokeWidth={12} strokeLinecap="round"
            strokeDasharray={`${c * frac} ${c}`} transform={`rotate(-90 ${cx} ${cx})`} />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', textAlign: 'center' }}>
          <div>
            <div style={{ fontFamily: 'var(--font-body)', fontVariantNumeric: 'tabular-nums', fontSize: size * 0.22, fontWeight: 600, lineHeight: 1, color: 'var(--text)' }}>
              {Math.round(total)}
            </div>
            <div style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--text-dim)', marginTop: 2 }}>/ 1000</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 600, marginTop: 6, color: col }}>{level}</div>
          </div>
        </div>
      </div>
      {depasse > 0 ? (
        <span style={{ fontFamily: 'var(--font-body)', fontVariantNumeric: 'tabular-nums', fontSize: 12, fontWeight: 600, color: col }}>+{depasse} au-delà du Max</span>
      ) : null}
    </div>
  )
}
