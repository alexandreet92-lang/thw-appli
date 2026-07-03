'use client'

// ══════════════════════════════════════════════════════════════════
// LapsRunChart — déclencheur des tours pour la COURSE À PIED.
// Équivalent running de LapsBikeChart : 1 barre = 1 tour, hauteur ∝
// vitesse moyenne (barre haute = tour rapide), largeur ∝ durée, label
// au-dessus = ALLURE (min/km). Tap (souris + tactile) → onLapTap(i),
// qui ouvre la LapsDetailView partagée (sport="running").
// Même logique de tap que LapsBikeChart (fix mobile iOS).
// ══════════════════════════════════════════════════════════════════

import { useState, useEffect } from 'react'
import { formatPace, speedMsToPace } from '@/lib/utils/pace'
import { useI18n } from '@/lib/i18n'

interface LapData {
  lap_index?:        number
  start_index?:      number
  end_index?:        number
  distance_m:        number
  moving_time_s:     number
  elapsed_time_s?:   number | null
  avg_hr?:           number | null
  max_heartrate?:    number | null
  avg_speed_ms?:     number | null
  avg_watts?:        number | null
  avg_cadence?:      number | null
  elevation_gain_m?: number | null
  temp_avg?:         number | null
}

interface Props {
  activityId:  string
  cachedLaps?: LapData[] | null
  avgSpeedMs?: number | null
  onLapTap?:   (lapIndex: number) => void
}

// Vitesse moy d'un tour (m/s), reconstituée depuis distance/durée si absente.
function lapSpeedMs(lap: LapData): number {
  if (lap.avg_speed_ms && lap.avg_speed_ms > 0) return lap.avg_speed_ms
  if (lap.distance_m > 0 && lap.moving_time_s > 0) return lap.distance_m / lap.moving_time_s
  return 0
}

// Palette running : vitesse relative → vert (rapide = vert foncé).
const RUN_SPEED_COLORS = ['#A7F3D0', '#6EE7B7', '#34D399', '#10B981', '#059669', '#047857'] as const
function runSpeedColor(speedMs: number, minSpeed: number, maxSpeed: number): string {
  if (maxSpeed <= minSpeed) return RUN_SPEED_COLORS[3]
  const t = (speedMs - minSpeed) / (maxSpeed - minSpeed)
  const idx = Math.max(0, Math.min(RUN_SPEED_COLORS.length - 1, Math.round(t * (RUN_SPEED_COLORS.length - 1))))
  return RUN_SPEED_COLORS[idx]
}

export function LapsRunChart({ activityId, cachedLaps, avgSpeedMs, onLapTap }: Props) {
  const { t } = useI18n()
  const [laps,    setLaps]    = useState<LapData[]>(cachedLaps && cachedLaps.length > 1 ? cachedLaps : [])
  const [loading, setLoading] = useState(!cachedLaps || cachedLaps.length <= 1)
  const [error,   setError]   = useState<string | null>(null)

  useEffect(() => {
    if (cachedLaps && cachedLaps.length > 1) return
    fetch(`/api/strava/activity-laps?activity_id=${activityId}`)
      .then(r => r.json())
      .then((data: { laps?: LapData[]; error?: string }) => {
        if (data.error) { setError(data.error); return }
        setLaps(data.laps ?? [])
      })
      .catch(() => setError(t('activities.lapsLoadError')))
      .finally(() => setLoading(false))
  }, [activityId, cachedLaps, t])

  if (loading) {
    return (
      <div style={{ marginBottom: 32, paddingTop: 8 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-dim)', letterSpacing: 0.9, textTransform: 'uppercase', marginBottom: 16, borderBottom: '1px solid var(--border)', paddingBottom: 5 }}>{t('activities.laps')}</div>
        <div style={{ fontSize: 12, color: 'var(--text-dim)', padding: '12px 0' }}>{t('activities.loadingLaps')}</div>
      </div>
    )
  }
  if (error) {
    return (
      <div style={{ marginBottom: 32, paddingTop: 8 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-dim)', letterSpacing: 0.9, textTransform: 'uppercase', marginBottom: 10, borderBottom: '1px solid var(--border)', paddingBottom: 5 }}>{t('activities.laps')}</div>
        <div style={{ fontSize: 11, color: 'var(--text-dim)', padding: '8px 0' }}>{t('activities.lapsLoadError')}</div>
      </div>
    )
  }

  if (laps.length <= 1) return null
  const speeds = laps.map(lapSpeedMs)
  if (!speeds.some(s => s > 0)) return null

  // ── SVG layout (viewBox fixe) ──────────────────────────────────────────
  const N        = laps.length
  const VBW      = 600
  const PAD_L    = 52
  const PAD_R    = 8
  const PAD_T    = 22
  const PAD_B    = 26
  const CH       = 150
  const SVG_H    = PAD_T + CH + PAD_B
  const innerW   = VBW - PAD_L - PAD_R
  const GAP      = 1.5
  const totalBarW= Math.max(1, innerW - (N - 1) * GAP)

  const totalTime = laps.reduce((s, l) => s + Math.max(0, l.moving_time_s || 0), 0) || 1
  const widths: number[] = laps.map(l => Math.max(2, (Math.max(0, l.moving_time_s || 0) / totalTime) * totalBarW))
  const wSum = widths.reduce((a, b) => a + b, 0)
  if (wSum > 0 && wSum !== totalBarW) {
    const k = totalBarW / wSum
    for (let i = 0; i < widths.length; i++) widths[i] = Math.max(2, widths[i] * k)
  }
  const xs: number[] = []
  {
    let cursor = PAD_L
    for (let i = 0; i < N; i++) { xs.push(cursor); cursor += widths[i] + GAP }
  }

  const minSpeed = Math.min(...speeds.filter(s => s > 0))
  const maxSpeedRaw = Math.max(...speeds)
  const maxY = maxSpeedRaw * 1.05 || 1
  const yOf = (sp: number) => PAD_T + CH - (sp / maxY) * CH

  // Repères Y étiquetés en allure (rapide en haut).
  const ySteps = 4
  const yMarks = Array.from({ length: ySteps }, (_, i) => {
    const sp = (maxY / ySteps) * (i + 1)
    return { y: yOf(sp), label: formatPace(speedMsToPace(sp)) }
  })

  const avgY = avgSpeedMs != null && avgSpeedMs > 0 ? yOf(avgSpeedMs) : null
  const labelStep = N <= 10 ? 1 : N <= 20 ? 2 : N <= 40 ? 5 : Math.ceil(N / 10)

  function lapIdxFromClientX(clientX: number, rect: DOMRect): number {
    if (rect.width === 0) return -1
    const xViewBox = ((clientX - rect.left) / rect.width) * VBW
    for (let i = 0; i < N; i++) if (xViewBox >= xs[i] && xViewBox < xs[i] + widths[i] + GAP) return i
    const dists = laps.map((_, i) => Math.abs(xs[i] + widths[i] / 2 - xViewBox))
    return dists.indexOf(Math.min(...dists))
  }

  return (
    <div style={{ marginBottom: 32, paddingTop: 8 }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-dim)', letterSpacing: 0.9, textTransform: 'uppercase', marginBottom: 16, borderBottom: '1px solid var(--border)', paddingBottom: 5 }}>
        {t('activities.lapsCount', { n: N })}
      </div>

      {/* Wrapper relatif : tap souris (onClick) + tactile (onTouchEnd + preventDefault). */}
      <div
        onClick={e => {
          const idx = lapIdxFromClientX(e.clientX, (e.currentTarget as HTMLDivElement).getBoundingClientRect())
          if (idx >= 0) onLapTap?.(idx)
        }}
        onTouchEnd={e => {
          e.preventDefault(); e.stopPropagation()
          const t = e.changedTouches[0]; if (!t) return
          const idx = lapIdxFromClientX(t.clientX, (e.currentTarget as HTMLDivElement).getBoundingClientRect())
          if (idx >= 0) onLapTap?.(idx)
        }}
        style={{
          position: 'relative', width: '100%',
          paddingBottom: `${(SVG_H / VBW) * 100}%`,
          cursor: onLapTap ? 'pointer' : 'default',
          touchAction: 'none', WebkitTapHighlightColor: 'transparent',
          WebkitUserSelect: 'none', userSelect: 'none',
        }}
      >
        <svg
          viewBox={`0 0 ${VBW} ${SVG_H}`}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block', pointerEvents: 'none' }}
          preserveAspectRatio="xMidYMid meet"
        >
          {/* Y grid + labels (allure) */}
          {yMarks.map((m, i) => (
            <g key={i}>
              <line x1={PAD_L} y1={m.y} x2={PAD_L + innerW} y2={m.y} stroke="var(--border)" strokeWidth="0.5" strokeDasharray="2 3" vectorEffect="non-scaling-stroke" />
              <text x={PAD_L - 4} y={m.y + 3.5} textAnchor="end" fontSize="9" fill="var(--text-dim)" style={{ fontVariantNumeric: 'tabular-nums', fontFamily: 'Barlow Condensed, sans-serif' }}>{m.label}</text>
            </g>
          ))}
          <text x={8} y={PAD_T + CH / 2} textAnchor="middle" fontSize="8" fill="var(--text-dim)" transform={`rotate(-90, 8, ${PAD_T + CH / 2})`}>min/km</text>

          {avgY !== null && (
            <line x1={PAD_L} y1={avgY} x2={PAD_L + innerW} y2={avgY} stroke="#475569" strokeWidth="1" strokeDasharray="4 3" vectorEffect="non-scaling-stroke" />
          )}

          {laps.map((lap, i) => {
            const sp = speeds[i]
            const bH = sp > 0 ? Math.max(2, (sp / maxY) * CH) : 2
            const bY = yOf(sp)
            const bX = xs[i]
            const bW = widths[i]
            const fill = runSpeedColor(sp, minSpeed, maxSpeedRaw)
            const showLabel    = bW >= 18 && bH >= 18 && sp > 0
            const showTickName = i % labelStep === 0 || i === N - 1
            return (
              <g key={i}>
                <rect x={bX} y={bY} width={bW} height={bH} fill={fill} rx={1.5} style={{ pointerEvents: 'none' }} />
                {showLabel && (
                  <text x={bX + bW / 2} y={bY - 4} textAnchor="middle" fontSize="9" fill="#059669" fontWeight="600"
                    style={{ fontVariantNumeric: 'tabular-nums', fontFamily: 'Barlow Condensed, sans-serif', pointerEvents: 'none' }}>
                    {formatPace(speedMsToPace(sp))}
                  </text>
                )}
                {showTickName && (
                  <text x={bX + bW / 2} y={PAD_T + CH + PAD_B - 8} textAnchor="middle" fontSize="10" fill="var(--text-dim)"
                    style={{ fontVariantNumeric: 'tabular-nums', fontFamily: 'Barlow Condensed, sans-serif', pointerEvents: 'none' }}>
                    {i + 1}
                  </text>
                )}
              </g>
            )
          })}
        </svg>
      </div>
    </div>
  )
}
