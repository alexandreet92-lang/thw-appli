'use client'

interface Props {
  samples: number[]
  isDark: boolean
  accent?: string
  width?: number
  height?: number
}

export default function HRMiniChart({ samples, isDark, accent = '#EF4444', width = 120, height = 40 }: Props) {
  if (samples.length < 2) {
    return (
      <div style={{ width, height, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: 11, color: isDark ? 'rgba(255,255,255,0.3)' : '#9CA3AF' }}>–</span>
      </div>
    )
  }

  const min = Math.min(...samples)
  const max = Math.max(...samples)
  const range = max - min || 1
  const pad = 4

  const points = samples.map((v, i) => {
    const x = pad + (i / (samples.length - 1)) * (width - pad * 2)
    const y = pad + (1 - (v - min) / range) * (height - pad * 2)
    return `${x},${y}`
  }).join(' ')

  const fillPoints = `${pad},${height} ${points} ${width - pad},${height}`
  const stroke = accent
  const fill = isDark ? `${accent}22` : `${accent}18`

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <polygon points={fillPoints} fill={fill} />
      <polyline points={points} fill="none" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
