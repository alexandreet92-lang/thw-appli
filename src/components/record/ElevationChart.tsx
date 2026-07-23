'use client'
import { useRef, useState, useCallback, useEffect, useMemo } from 'react'
import { useI18n } from '@/lib/i18n'
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
const SURFACE_LABEL_KEYS: Record<string, string> = {
  asphalt: 'record.surfaceAsphalt', unpaved: 'record.surfaceUnpaved', gravel: 'record.surfaceGravel', path: 'record.surfacePath', unknown: 'record.surfaceUnknown',
}

const PAD = { top: 16, bottom: 20, left: 38, right: 14 }
const N_SAMPLES = 110

// Rééchantillonnage à pas de distance CONSTANT (interpolation linéaire) : supprime
// la densité irrégulière des points GPS avant lissage.
function resampleUniform(data: ElevPoint[], n: number): ElevPoint[] {
  const total = data[data.length - 1].distanceM
  if (data.length < 3 || total <= 0) return data
  const out: ElevPoint[] = []
  let j = 0
  for (let i = 0; i <= n; i++) {
    const d = (i / n) * total
    while (j < data.length - 2 && data[j + 1].distanceM < d) j++
    const a = data[j], b = data[j + 1]
    const span = b.distanceM - a.distanceM
    const t = span > 0 ? Math.max(0, Math.min(1, (d - a.distanceM) / span)) : 0
    out.push({ distanceM: d, altitudeM: a.altitudeM + (b.altitudeM - a.altitudeM) * t })
  }
  return out
}

function movingAvg(data: ElevPoint[], half: number): ElevPoint[] {
  if (data.length < 3 || half < 1) return data
  return data.map((d, i) => {
    let sum = 0, n = 0
    for (let j = Math.max(0, i - half); j <= Math.min(data.length - 1, i + half); j++) { sum += data[j].altitudeM; n++ }
    return { ...d, altitudeM: sum / n }
  })
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

// Courbe lisse (Catmull-Rom → Bézier cubique)
function buildSmoothPath(points: { x: number; y: number }[]): string {
  if (points.length < 2) return ''
  let d = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i]
    const p1 = points[i]
    const p2 = points[i + 1]
    const p3 = points[i + 2] ?? p2
    const cp1x = p1.x + (p2.x - p0.x) / 6
    const cp1y = p1.y + (p2.y - p0.y) / 6
    const cp2x = p2.x - (p3.x - p1.x) / 6
    const cp2y = p2.y - (p3.y - p1.y) / 6
    d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`
  }
  return d
}

export default function ElevationChart({ data, surfaces, height = 100, isDark = false, snappedPoints, onPositionChange }: Props) {
  const { t } = useI18n()
  const wrapRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const [W, setW] = useState(360)
  const [cursor, setCursor] = useState<{ x: number; y: number; point: ElevPoint } | null>(null)
  const dim = isDark ? 'rgba(255,255,255,0.35)' : '#9CA3AF'
  const gridStroke = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(17,24,39,0.07)'

  // Largeur réelle mesurée → viewBox = pixels (aucune distorsion, vrai plein largeur).
  useEffect(() => {
    const el = wrapRef.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(entries => {
      const w = entries[0]?.contentRect.width
      if (w && w > 0) setW(Math.round(w))
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const cW = W - PAD.left - PAD.right
  const cH = height - PAD.top - PAD.bottom

  // Rééchantillonnage uniforme + double moyenne glissante → courbe réellement lisse.
  const pts = useMemo(() => {
    if (data.length < 3) return data
    return movingAvg(movingAvg(resampleUniform(data, N_SAMPLES), 3), 2)
  }, [data])

  const { minA, maxA, totalM } = useMemo(() => {
    if (pts.length === 0) return { minA: 0, maxA: 1, totalM: 1 }
    const alts = pts.map(d => d.altitudeM)
    return { minA: Math.min(...alts), maxA: Math.max(...alts), totalM: pts[pts.length - 1].distanceM || 1 }
  }, [pts])

  // Échelle verticale ANTI-EXAGÉRATION : un parcours plat ne doit pas remplir
  // toute la hauteur (sinon le moindre mètre de bruit devient une montagne).
  const dispRng = Math.max((maxA - minA) * 1.25, 30)
  const midAlt = (minA + maxA) / 2
  const loA = midAlt - dispRng / 2
  const hiA = midAlt + dispRng / 2

  const getX = useCallback((distM: number) => PAD.left + (distM / totalM) * cW, [totalM, cW])
  const getY = useCallback((alt: number) => PAD.top + (1 - (alt - loA) / dispRng) * cH, [loA, dispRng, cH])

  const handleMove = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    if (!svgRef.current || pts.length < 2) return
    const rect = svgRef.current.getBoundingClientRect()
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    const px = ((clientX - rect.left) / rect.width) * W
    const xClamped = Math.max(PAD.left, Math.min(PAD.left + cW, px))
    const distAtX = ((xClamped - PAD.left) / cW) * totalM
    const idx = indexForDistance(pts, distAtX)
    const pt = pts[idx]
    // Trait + pastille + bulle posés sur le MÊME point de la courbe → suit l'embout.
    setCursor({ x: getX(pt.distanceM), y: getY(pt.altitudeM), point: pt })

    if (onPositionChange && snappedPoints && snappedPoints.length > 0) {
      const gIdx = snappedPoints.length === pts.length
        ? idx
        : Math.round((idx / (pts.length - 1)) * (snappedPoints.length - 1))
      onPositionChange(snappedPoints[gIdx] ?? null)
    }
  }, [pts, cW, W, totalM, getX, getY, snappedPoints, onPositionChange])

  const handleEnd = useCallback(() => {
    setCursor(null)
    onPositionChange?.(null)
  }, [onPositionChange])

  if (pts.length < 2) return (
    <div ref={wrapRef} style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ fontSize: 11, color: dim, margin: 0 }}>{t('record.elevationChartEmpty')}</p>
    </div>
  )

  const linePts = pts.map(d => ({ x: getX(d.distanceM), y: getY(d.altitudeM) }))
  const pathD = buildSmoothPath(linePts)
  const lastX = getX(pts[pts.length - 1].distanceM).toFixed(1)
  const baseY = (PAD.top + cH).toFixed(1)
  const areaD = `${pathD} L ${lastX} ${baseY} L ${PAD.left} ${baseY} Z`
  const startPt = linePts[0]
  const endPt = linePts[linePts.length - 1]
  const yTicks = [loA, midAlt, hiA]

  return (
    <div ref={wrapRef} style={{ position: 'relative', width: '100%' }}>
      <svg ref={svgRef} width="100%" height={height} viewBox={`0 0 ${W} ${height}`} preserveAspectRatio="none"
        style={{ touchAction: 'none', display: 'block' }}
        onTouchMove={handleMove} onTouchStart={handleMove} onTouchEnd={handleEnd}
        onMouseMove={handleMove} onMouseLeave={handleEnd}>
        <defs>
          <linearGradient id="elevGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#06B6D4" stopOpacity={0.28} />
            <stop offset="100%" stopColor="#06B6D4" stopOpacity={0.02} />
          </linearGradient>
        </defs>

        {/* Lignes de grille horizontales discrètes */}
        {yTicks.map((alt, i) => (
          <line key={i} x1={PAD.left} y1={getY(alt)} x2={PAD.left + cW} y2={getY(alt)} stroke={gridStroke} strokeWidth={1} vectorEffect="non-scaling-stroke" />
        ))}

        <path d={areaD} fill="url(#elevGrad)" />
        <path d={pathD} fill="none" stroke="#06B6D4" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />

        {/* Graduations altitude (Y) */}
        {yTicks.map((alt, i) => (
          <text key={i} x={PAD.left - 6} y={getY(alt) + 3} textAnchor="end" fontSize={8} fill={dim} style={{ fontVariantNumeric: 'tabular-nums' }}>{Math.round(alt)}m</text>
        ))}
        {/* Graduations distance (X) */}
        {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => {
          const idx = Math.round(pct * (pts.length - 1))
          return <text key={i} x={getX(pts[idx].distanceM)} y={PAD.top + cH + 13} textAnchor="middle" fontSize={8} fill={dim} style={{ fontVariantNumeric: 'tabular-nums' }}>{(pts[idx].distanceM / 1000).toFixed(1)}km</text>
        })}

        {/* Départ / arrivée */}
        <circle cx={startPt.x} cy={startPt.y} r={4.5} fill="#10B981" stroke="#fff" strokeWidth={1.8} vectorEffect="non-scaling-stroke" />
        <circle cx={endPt.x} cy={endPt.y} r={4.5} fill="#EF4444" stroke="#fff" strokeWidth={1.8} vectorEffect="non-scaling-stroke" />

        {/* Curseur — trait + pastille alignés sur la courbe */}
        {cursor && (
          <>
            <line x1={cursor.x} y1={PAD.top} x2={cursor.x} y2={PAD.top + cH} stroke="#06B6D4" strokeWidth={1.4} strokeDasharray="3 3" vectorEffect="non-scaling-stroke" />
            <circle cx={cursor.x} cy={cursor.y} r={4.5} fill="#06B6D4" stroke="#fff" strokeWidth={2} vectorEffect="non-scaling-stroke" />
          </>
        )}
      </svg>
      {cursor && (
        <div style={{ position: 'absolute', top: 2, left: `${Math.max(6, Math.min(94, (cursor.x / W) * 100))}%`, transform: 'translateX(-50%)', background: 'rgba(0,0,0,0.78)', borderRadius: 7, padding: '3px 9px', pointerEvents: 'none', whiteSpace: 'nowrap' }}>
          <p style={{ fontSize: 12, color: 'white', margin: 0, fontWeight: 600 }}>{Math.round(cursor.point.altitudeM)}m</p>
          <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', margin: 0 }}>{(cursor.point.distanceM / 1000).toFixed(2)}km</p>
        </div>
      )}
      {surfaces && surfaces.filter(s => s.percent > 0).length > 0 && (
        <div style={{ display: 'flex', gap: 10, paddingTop: 4, flexWrap: 'wrap' }}>
          {surfaces.filter(s => s.percent > 0).map(s => (
            <div key={s.type} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <div style={{ width: 16, height: 3, borderRadius: 2, background: SURFACE_COLORS[s.type] ?? '#8C8C8C' }} />
              <span style={{ fontSize: 10, color: dim }}>{s.percent}% {SURFACE_LABEL_KEYS[s.type] ? t(SURFACE_LABEL_KEYS[s.type]) : s.type}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
