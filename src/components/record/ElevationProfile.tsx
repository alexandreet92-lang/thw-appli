'use client'
import type { GPSPoint } from '@/hooks/useGPSTracking'

function haversineM(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371000
  const dLat = (b.lat - a.lat) * Math.PI / 180
  const dLng = (b.lng - a.lng) * Math.PI / 180
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x))
}

interface Props {
  points: GPSPoint[]
  isDark?: boolean
  height?: number
}

export default function ElevationProfile({ points, isDark = false, height = 100 }: Props) {
  const pts = points.filter(p => p.altitude != null) as (GPSPoint & { altitude: number })[]
  if (pts.length < 3) {
    return (
      <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: 12, color: isDark ? 'rgba(255,255,255,0.3)' : '#aaa' }}>Pas de données d&apos;altitude</span>
      </div>
    )
  }

  // Sample to max 200 points
  const step = Math.max(1, Math.floor(pts.length / 200))
  const sampled: (GPSPoint & { altitude: number })[] = []
  const dists: number[] = []
  let cumDist = 0
  for (let i = 0; i < pts.length; i += step) {
    if (i > 0) cumDist += haversineM(pts[i - step < 0 ? 0 : i - step], pts[i])
    sampled.push(pts[i])
    dists.push(cumDist)
  }

  const totalDist = dists[dists.length - 1] || 1
  const alts = sampled.map(p => p.altitude)
  const minAlt = Math.min(...alts)
  const maxAlt = Math.max(...alts)
  const range = maxAlt - minAlt || 1
  const W = 400
  const H = height
  const pad = 8
  const xS = (d: number) => (d / totalDist) * W
  const yS = (a: number) => H - pad - ((a - minAlt) / range) * (H - pad * 2)

  const linePts = sampled.map((p, i) => `${i === 0 ? 'M' : 'L'}${xS(dists[i]).toFixed(1)},${yS(p.altitude).toFixed(1)}`).join(' ')
  const areaPath = linePts + ` L${W},${H} L0,${H} Z`
  const stroke = '#06B6D4'
  const gradId = 'elev-grad'
  const dimText = isDark ? 'rgba(255,255,255,0.35)' : '#999'

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={height} preserveAspectRatio="none" style={{ display: 'block' }}>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.25"/>
          <stop offset="100%" stopColor={stroke} stopOpacity="0"/>
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#${gradId})`}/>
      <path d={linePts} fill="none" stroke={stroke} strokeWidth="2" strokeLinejoin="round"/>
      <text x="2" y="11" fontSize="9" fill={dimText}>{Math.round(maxAlt)}m</text>
      <text x="2" y={H - 2} fontSize="9" fill={dimText}>{Math.round(minAlt)}m</text>
      <text x={W - 2} y={H - 2} fontSize="9" fill={dimText} textAnchor="end">{(totalDist / 1000).toFixed(1)}km</text>
    </svg>
  )
}
