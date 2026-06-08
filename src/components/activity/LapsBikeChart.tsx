'use client'

import { useState, useEffect } from 'react'

interface LapData {
  lap_index?:       number
  start_index?:     number
  end_index?:       number
  distance_m:       number
  moving_time_s:    number
  elapsed_time_s?:  number | null
  avg_hr?:          number | null
  max_heartrate?:   number | null
  avg_speed_ms?:    number | null
  avg_watts?:       number | null
  max_watts?:       number | null
  avg_cadence?:     number | null
  elevation_gain_m?:number | null
  temp_avg?:        number | null
}

interface Props {
  activityId:   string
  cachedLaps?:  LapData[] | null
  avgWatts?:    number | null
  streams?:     { watts?: number[] | null } | null
  ftp?:         number | null
  onLapTap?:    (lapIndex: number) => void
}

// ── Formatters ─────────────────────────────────────────────────────────────
function fmtDur(s: number): string {
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = Math.floor(s % 60)
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
  return `${m}:${String(sec).padStart(2, '0')}`
}

// ── Power zones (% FTP → violet shade) ─────────────────────────────────────
const POWER_ZONE_COLORS = [
  '#EDE9FE',  // Z1 récup       <55%
  '#C4B5FD',  // Z2 endurance   55-75%
  '#A78BFA',  // Z3 tempo       75-90%
  '#8B5CF6',  // Z4 seuil       90-105%
  '#7C3AED',  // Z5 VO2max     105-120%
  '#6B21A8',  // Z6 anaérobie+  >120%
] as const

function powerZoneColor(watts: number, ftp: number | null | undefined): string {
  if (!ftp || ftp <= 0 || !watts || watts <= 0) return POWER_ZONE_COLORS[2]  // fallback Z3
  const pct = watts / ftp
  if (pct < 0.55) return POWER_ZONE_COLORS[0]
  if (pct < 0.75) return POWER_ZONE_COLORS[1]
  if (pct < 0.90) return POWER_ZONE_COLORS[2]
  if (pct < 1.05) return POWER_ZONE_COLORS[3]
  if (pct < 1.20) return POWER_ZONE_COLORS[4]
  return POWER_ZONE_COLORS[5]
}

// Darken a hex color by ~12% (for hover/selected states)
function darken(hex: string, factor = 0.82): string {
  const h = hex.replace('#', '')
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  const k = factor
  const rr = Math.max(0, Math.round(r * k)).toString(16).padStart(2, '0')
  const gg = Math.max(0, Math.round(g * k)).toString(16).padStart(2, '0')
  const bb = Math.max(0, Math.round(b * k)).toString(16).padStart(2, '0')
  return `#${rr}${gg}${bb}`
}

// ── Main component ─────────────────────────────────────────────────────────
export function LapsBikeChart({ activityId, cachedLaps, avgWatts, ftp, onLapTap }: Props) {
  const [laps,        setLaps]        = useState<LapData[]>(cachedLaps && cachedLaps.length > 1 ? cachedLaps : [])
  const [loading,     setLoading]     = useState(!cachedLaps || cachedLaps.length <= 1)
  const [error,       setError]       = useState<string | null>(null)
  const [hoveredLap,  setHoveredLap]  = useState<number | null>(null)

  useEffect(() => {
    if (cachedLaps && cachedLaps.length > 1) return
    fetch(`/api/strava/activity-laps?activity_id=${activityId}`)
      .then(r => r.json())
      .then((data: { laps?: LapData[]; error?: string }) => {
        if (data.error) { setError(data.error); return }
        setLaps(data.laps ?? [])
      })
      .catch(() => setError('Impossible de charger les tours'))
      .finally(() => setLoading(false))
  }, [activityId, cachedLaps])

  if (loading) {
    return (
      <div style={{ marginBottom: 32, paddingTop: 8 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-dim)', letterSpacing: 0.9,
          textTransform: 'uppercase', marginBottom: 16, borderBottom: '1px solid var(--border)',
          paddingBottom: 5 }}>
          Tours
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-dim)', padding: '12px 0' }}>Chargement des tours…</div>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ marginBottom: 32, paddingTop: 8 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-dim)', letterSpacing: 0.9,
          textTransform: 'uppercase', marginBottom: 10, borderBottom: '1px solid var(--border)',
          paddingBottom: 5 }}>
          Tours
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-dim)', padding: '8px 0' }}>
          Impossible de charger les tours
        </div>
      </div>
    )
  }

  // Don't show if 0 or 1 lap, or no power data
  if (laps.length <= 1) return null
  const hasWatts = laps.some(l => (l.avg_watts ?? 0) > 0)
  if (!hasWatts) return null

  // ── SVG layout (viewBox fixe) ──────────────────────────────────────────
  const N        = laps.length
  const VBW      = 600   // viewBox width — toujours fixe
  const PAD_L    = 44
  const PAD_R    = 8
  const PAD_T    = 22
  const PAD_B    = 26
  const CH       = 150   // chart height
  const SVG_H    = PAD_T + CH + PAD_B
  const innerW   = VBW - PAD_L - PAD_R
  const GAP      = 1.5
  const totalBarW= Math.max(1, innerW - (N - 1) * GAP)

  // Durées
  const totalTime = laps.reduce((s, l) => s + Math.max(0, l.moving_time_s || 0), 0) || 1

  // Largeur proportionnelle + position cumulative
  const widths: number[] = laps.map(l => {
    const raw = (Math.max(0, l.moving_time_s || 0) / totalTime) * totalBarW
    return Math.max(2, raw)
  })
  // Renormaliser pour que la somme = totalBarW (compenser les min 2)
  const wSum = widths.reduce((a, b) => a + b, 0)
  if (wSum > 0 && wSum !== totalBarW) {
    const k = totalBarW / wSum
    for (let i = 0; i < widths.length; i++) widths[i] = Math.max(2, widths[i] * k)
  }
  const xs: number[] = []
  {
    let cursor = PAD_L
    for (let i = 0; i < N; i++) {
      xs.push(cursor)
      cursor += widths[i] + GAP
    }
  }

  // Axe Y
  const maxW = Math.max(...laps.map(l => l.avg_watts ?? 0)) * 1.05 || 1
  const yStep = maxW > 400 ? 100 : maxW > 200 ? 50 : 25
  const yLabels: number[] = []
  for (let w = 0; w <= maxW; w += yStep) yLabels.push(Math.round(w))

  const yOf = (w: number) => PAD_T + CH - (w / maxW) * CH

  // Avg watts dashed line
  const avgY = avgWatts != null ? yOf(avgWatts) : null

  // Label step : on évite les labels qui se chevauchent
  const labelStep = N <= 10 ? 1 : N <= 20 ? 2 : N <= 40 ? 5 : Math.ceil(N / 10)

  return (
    <div style={{ marginBottom: 32, paddingTop: 8 }}>
      {/* Section header */}
      <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-dim)', letterSpacing: 0.9,
        textTransform: 'uppercase', marginBottom: 16, borderBottom: '1px solid var(--border)',
        paddingBottom: 5 }}>
        Tours · {N}
      </div>

      {/* SVG chart — largeur 100% du conteneur, jamais de scroll horizontal */}
      <svg
        viewBox={`0 0 ${VBW} ${SVG_H}`}
        style={{ width: '100%', height: 'auto', display: 'block' }}
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Y-axis grid + labels */}
        {yLabels.map(w => {
          const y = yOf(w)
          return (
            <g key={w}>
              <line x1={PAD_L} y1={y} x2={PAD_L + innerW} y2={y}
                stroke="var(--border)" strokeWidth="0.5" strokeDasharray={w === 0 ? '' : '2 3'}
                vectorEffect="non-scaling-stroke" />
              <text x={PAD_L - 4} y={y + 3.5} textAnchor="end"
                fontSize="9" fill="var(--text-dim)" style={{ fontVariantNumeric: 'tabular-nums', fontFamily: 'Barlow Condensed, sans-serif' }}>
                {w}
              </text>
            </g>
          )
        })}

        {/* W axis label */}
        <text x={6} y={PAD_T + CH / 2} textAnchor="middle" fontSize="9" fill="var(--text-dim)"
          transform={`rotate(-90, 6, ${PAD_T + CH / 2})`}>W</text>

        {/* Average watts line */}
        {avgY !== null && (
          <line x1={PAD_L} y1={avgY} x2={PAD_L + innerW} y2={avgY}
            stroke="#475569" strokeWidth="1" strokeDasharray="4 3"
            vectorEffect="non-scaling-stroke" />
        )}

        {/* Bars */}
        {laps.map((lap, i) => {
          const w        = lap.avg_watts ?? 0
          const bH       = w > 0 ? Math.max(2, (w / maxW) * CH) : 2
          const bY       = yOf(w)
          const bX       = xs[i]
          const bW       = widths[i]
          const hov      = hoveredLap === i
          const baseFill = powerZoneColor(w, ftp)
          const fill     = hov ? darken(baseFill, 0.85) : baseFill
          const showLabel    = bW >= 18 && bH >= 18 && w > 0
          const showTickName = i % labelStep === 0 || i === N - 1

          return (
            <g
              key={i}
              onMouseEnter={() => setHoveredLap(i)}
              onMouseLeave={() => setHoveredLap(null)}
            >
              {/* Hit area transparente sur toute la hauteur — porte les handlers
                  pour fiabilité tactile (les events sur <g> SVG sont incompat sur certains browsers iOS) */}
              <rect
                x={bX} y={PAD_T} width={bW + GAP} height={CH}
                fill="transparent"
                onClick={() => onLapTap?.(i)}
                onTouchEnd={e => { e.preventDefault(); onLapTap?.(i) }}
                onPointerUp={e => {
                  // Fallback unifié pour les browsers récents (Pointer Events)
                  if (e.pointerType === 'mouse') return  // évite double-fire avec onClick
                  onLapTap?.(i)
                }}
                style={{
                  cursor: onLapTap ? 'pointer' : 'default',
                  pointerEvents: 'all',
                }}
              />
              {/* Bar */}
              <rect
                x={bX}
                y={bY}
                width={bW}
                height={bH}
                fill={fill}
                stroke="none"
                strokeWidth={0}
                vectorEffect="non-scaling-stroke"
                rx={1.5}
                style={{ transition: 'fill 0.15s', pointerEvents: 'none' }}
              />
              {/* Watts au-dessus si place */}
              {showLabel && (
                <text x={bX + bW / 2} y={bY - 4} textAnchor="middle"
                  fontSize="9" fill="#7C3AED" fontWeight="600"
                  style={{ fontVariantNumeric: 'tabular-nums', fontFamily: 'Barlow Condensed, sans-serif', pointerEvents: 'none' }}>
                  {Math.round(w)}
                </text>
              )}
              {/* Label sous la barre — numéro sans préfixe (cohérent avec LapsDetailView) */}
              {showTickName && (
                <text x={bX + bW / 2} y={PAD_T + CH + PAD_B - 8}
                  textAnchor="middle" fontSize="10"
                  fill="var(--text-dim)"
                  style={{ fontVariantNumeric: 'tabular-nums', fontFamily: 'Barlow Condensed, sans-serif', pointerEvents: 'none' }}>
                  {i + 1}
                </text>
              )}
            </g>
          )
        })}
      </svg>
    </div>
  )
}
