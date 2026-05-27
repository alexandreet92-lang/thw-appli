'use client'
import { useRef, useState, useCallback } from 'react'
import type { ElevPoint, Surface } from '@/lib/openrouteservice'

interface Props {
  data: ElevPoint[]
  surfaces?: Surface[]
  height?: number
  isDark?: boolean
  snappedPoints?: { lat: number; lng: number }[]
  onPositionChange?: (point: { lat: number; lng: number } | null) => void
}

const SURFACE_COLORS: Record<string, string> = {
  asphalt: '#3B82F6', unpaved: '#F59E0B', gravel: '#8B5CF6', path: '#10B981', unknown: '#8C8C8C',
}
const SURFACE_LABELS: Record<string, string> = {
  asphalt: 'Goudron', unpaved: 'Chemin', gravel: 'Graviers', path: 'Sentier', unknown: 'Inconnu',
}

const W = 360
const PAD = { top: 18, bottom: 20, left: 34, right: 8 }
const MAX_PTS = 150

function downsample<T>(arr: T[], max: number): T[] {
  if (arr.length <= max) return arr
  const step = arr.length / max
  return Array.from({ length: max }, (_, i) => arr[Math.round(i * step)])
}

function indexForDistance(data: { distanceM: number }[], targetM: number): number {
  const hi = data.length - 1
  if (targetM <= data[0].distanceM) return 0
  if (targetM >= data[hi].distanceM) return hi
  let lo = 0, h = hi
  while (lo < h) {
    const mid = (lo + h) >> 1
    if (data[mid].distanceM < targetM) lo = mid + 1
    else h = mid
  }
  return (lo > 0 &&
    Math.abs(data[lo - 1].distanceM - targetM) <= Math.abs(data[lo].distanceM - targetM))
    ? lo - 1 : lo
}

function buildSmoothPath(
  data: { distanceM: number; altitudeM: number }[],
  getX: (distM: number) => number,
  getY: (alt: number) => number
): string {
  if (data.length < 2) return ''
  const points = data.map((d) => ({ x: getX(d.distanceM), y: getY(d.altitudeM) }))
  let d = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`
  for (let i = 1; i < points.length; i++) {
    const p0 = points[i - 1], p1 = points[i]
    const cpx = ((p0.x + p1.x) / 2).toFixed(1)
    d += ` C ${cpx} ${p0.y.toFixed(1)}, ${cpx} ${p1.y.toFixed(1)}, ${p1.x.toFixed(1)} ${p1.y.toFixed(1)}`
  }
  return d
}

export default function ElevationChart({ data, surfaces, height = 100, isDark = false, snappedPoints, onPositionChange }: Props) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [cursor, setCursor] = useState<{ svgX: number; point: ElevPoint } | null>(null)
  const dim = isDark ? 'rgba(255,255,255,0.35)' : '#9CA3AF'
  const cW = W - PAD.left - PAD.right
  const cH = height - PAD.top - PAD.bottom

  const pts = downsample(data, MAX_PTS)
  const alts = pts.map(d => d.altitudeM)
  const minA = Math.min(...alts), maxA = Math.max(...alts)
  const rng = maxA - minA || 1
  const totalM = pts.length > 0 ? pts[pts.length - 1].distanceM || 1 : 1

  // Distance-based X — correct pour points GPS non-équidistants
  const getX = (distM: number) => PAD.left + (distM / totalM) * cW
  const getY = (alt: number) => PAD.top + (1 - (alt - minA) / rng) * cH

  const handleMove = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    if (!svgRef.current || data.length === 0) return
    const rect = svgRef.current.getBoundingClientRect()
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    const frac = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))

    const idx = indexForDistance(data, frac * data[data.length - 1].distanceM)
    setCursor({ svgX: PAD.left + frac * cW, point: data[idx] })

    if (onPositionChange && snappedPoints && snappedPoints.length > 0) {
      let gps: { lat: number; lng: number } | undefined
      if (snappedPoints.length === data.length) {
        gps = snappedPoints[idx]
      } else {
        const gIdx = Math.round((idx / (data.length - 1)) * (snappedPoints.length - 1))
        gps = snappedPoints[gIdx]
      }
      onPositionChange(gps ?? null)
    }
  }, [data, cW, snappedPoints, onPositionChange])

  const handleEnd = useCallback(() => {
    setCursor(null)
    onPositionChange?.(null)
  }, [onPositionChange])

  if (pts.length < 2) return (
    <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ fontSize: 11, color: dim, margin: 0 }}>Tracez un parcours pour voir le profil</p>
    </div>
  )

  const pathD = buildSmoothPath(pts, getX, getY)
  const lastX = getX(pts[pts.length - 1].distanceM).toFixed(1)
  const baseY = (PAD.top + cH).toFixed(1)
  const areaD = `${pathD} L${lastX},${baseY} L${PAD.left},${baseY} Z`

  return (
    <div style={{ position: 'relative' }}>
      <svg ref={svgRef} width="100%" height={height} viewBox={`0 0 ${W} ${height}`}
        style={{ touchAction: 'none' }}
        onTouchMove={handleMove} onTouchStart={handleMove} onTouchEnd={handleEnd}
        onMouseMove={handleMove} onMouseLeave={handleEnd}>
        <defs>
          <linearGradient id="elevGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#06B6D4" stopOpacity={0.35} />
            <stop offset="100%" stopColor="#06B6D4" stopOpacity={0.04} />
          </linearGradient>
        </defs>
        <path d={areaD} fill="url(#elevGrad)" />
        <path d={pathD} fill="none" stroke="#06B6D4" strokeWidth={1.8} />
        {[minA, Math.round((minA + maxA) / 2), maxA].map((alt, i) => (
          <text key={i} x={PAD.left - 3} y={getY(alt) + 4} textAnchor="end" fontSize={8} fill={dim}>{Math.round(alt)}m</text>
        ))}
        {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => {
          const idx = Math.round(pct * (pts.length - 1))
          return <text key={i} x={getX(pts[idx].distanceM)} y={PAD.top + cH + 13} textAnchor="middle" fontSize={8} fill={dim}>{(pts[idx].distanceM / 1000).toFixed(1)}km</text>
        })}
        {cursor && <line x1={cursor.svgX} y1={PAD.top} x2={cursor.svgX} y2={PAD.top + cH} stroke="#06B6D4" strokeWidth={1.5} strokeDasharray="3 2" />}
      </svg>
      {cursor && (
        <div style={{ position: 'absolute', top: 2, left: `${Math.min((cursor.svgX - PAD.left) / cW * 100, 65)}%`, transform: 'translateX(-50%)', background: 'rgba(0,0,0,0.75)', borderRadius: 7, padding: '3px 9px', pointerEvents: 'none' }}>
          <p style={{ fontSize: 12, color: 'white', margin: 0, fontWeight: 600 }}>{cursor.point.altitudeM}m</p>
          <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', margin: 0 }}>{(cursor.point.distanceM / 1000).toFixed(2)}km</p>
        </div>
      )}
      {surfaces && surfaces.filter(s => s.percent > 0).length > 0 && (
        <div style={{ display: 'flex', gap: 10, paddingTop: 4, flexWrap: 'wrap' }}>
          {surfaces.filter(s => s.percent > 0).map(s => (
            <div key={s.type} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <div style={{ width: 16, height: 3, borderRadius: 2, background: SURFACE_COLORS[s.type] ?? '#8C8C8C' }} />
              <span style={{ fontSize: 10, color: dim }}>{s.percent}% {SURFACE_LABELS[s.type] ?? s.type}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
