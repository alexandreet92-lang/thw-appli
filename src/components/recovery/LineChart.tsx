'use client'

interface Props {
  values: number[]
  color: string
  height?: number
  showDots?: boolean
}

export default function LineChart({ values, color, height = 56, showDots = true }: Props) {
  if (values.length < 2) return null
  const W = 100
  const H = height
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1
  const pts = values.map((v, i) => ({
    x: (i / (values.length - 1)) * W,
    y: H - 4 - ((v - min) / range) * (H - 8),
  }))
  const polyline = pts.map(p => `${p.x},${p.y}`).join(' ')
  const area = `M ${pts[0].x},${H} ${pts.map(p => `L ${p.x},${p.y}`).join(' ')} L ${pts[pts.length-1].x},${H} Z`
  const gradId = `rcg${color.replace(/[^a-z0-9]/gi,'')}`

  return (
    <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ overflow:'visible' }}>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={color} stopOpacity="0.22"/>
          <stop offset="100%" stopColor={color} stopOpacity="0.02"/>
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gradId})`}/>
      <polyline fill="none" stroke={color} strokeWidth="1.5" points={polyline}
        strokeLinecap="round" strokeLinejoin="round"/>
      {showDots && pts.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="2" fill={color}
          opacity={i === pts.length - 1 ? 1 : 0.4}/>
      ))}
    </svg>
  )
}
