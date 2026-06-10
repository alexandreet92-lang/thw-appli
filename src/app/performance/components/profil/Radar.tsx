'use client'
// Radar « en un coup d'œil » — SVG brut, neutre + accent var(--primary).
const FB = 'var(--font-body)'

export function Radar({ scores, labels }: { scores: number[]; labels: string[] }) {
  const n = scores.length, R = 44, cx = 60, cy = 56
  const pt = (i: number, r: number): [number, number] => {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / n
    return [cx + Math.cos(a) * r, cy + Math.sin(a) * r]
  }
  const poly = scores.map((s, i) => { const [x, y] = pt(i, (Math.max(0, Math.min(100, s)) / 100) * R); return `${x.toFixed(1)},${y.toFixed(1)}` }).join(' ')
  return (
    <svg width={120} height={112} viewBox="0 0 120 112" style={{ display: 'block' }}>
      {[0.34, 0.67, 1].map(f => (
        <polygon key={f} points={labels.map((_, i) => { const [x, y] = pt(i, R * f); return `${x.toFixed(1)},${y.toFixed(1)}` }).join(' ')} fill="none" stroke="var(--border)" strokeWidth={1} />
      ))}
      <polygon points={poly} fill="var(--primary)" fillOpacity={0.15} stroke="var(--primary)" strokeWidth={1.5} strokeLinejoin="round" />
      {labels.map((l, i) => { const [x, y] = pt(i, R + 11); return <text key={l} x={x} y={y} textAnchor="middle" dominantBaseline="middle" fontFamily={FB} fontSize={8} fill="var(--text-dim)">{l}</text> })}
    </svg>
  )
}
