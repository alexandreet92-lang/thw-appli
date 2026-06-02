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
}

interface Props {
  activityId:   string
  cachedLaps?:  LapData[] | null
  avgWatts?:    number | null
  streams?:     { watts?: number[] | null } | null
}

// ── Formatters ─────────────────────────────────────────────────────────────
function fmtDur(s: number): string {
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = Math.floor(s % 60)
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
  return `${m}:${String(sec).padStart(2, '0')}`
}

function fmtDist(m: number): string {
  return (m / 1000).toFixed(2).replace('.', ',') + ' km'
}

function fmtSpeed(mps: number | null | undefined): string {
  if (!mps) return '—'
  return (mps * 3.6).toFixed(1).replace('.', ',') + ' km/h'
}

function fmtVal(v: number | null | undefined, unit: string, round = true): string {
  if (v == null) return '—'
  return `${round ? Math.round(v) : v} ${unit}`
}

// ── Detail panel ───────────────────────────────────────────────────────────
function LapDetailPanel({ lap, index, maxWatts, onClose }: { lap: LapData; index: number; maxWatts: number | null; onClose: () => void }) {
  const rows: { label: string; value: string }[] = [
    { label: 'Distance',    value: fmtDist(lap.distance_m) },
    { label: 'Durée',       value: fmtDur(lap.moving_time_s) },
    { label: 'Watts moy.',  value: fmtVal(lap.avg_watts, 'W') },
    { label: 'Watts max',   value: fmtVal(maxWatts ?? lap.max_watts ?? null, 'W') },
    { label: 'FC moy.',     value: fmtVal(lap.avg_hr, 'bpm') },
    { label: 'FC max',      value: fmtVal(lap.max_heartrate, 'bpm') },
    { label: 'RPM moy.',    value: fmtVal(lap.avg_cadence, 'rpm') },
    { label: 'D+',          value: lap.elevation_gain_m != null ? `+${Math.round(lap.elevation_gain_m)} m` : '—' },
    { label: 'Vitesse moy.',value: fmtSpeed(lap.avg_speed_ms) },
  ]

  return (
    <div style={{
      background:    'var(--bg-card)',
      border:        '0.5px solid var(--border)',
      borderRadius:  12,
      padding:       '16px 20px',
      marginTop:     16,
      position:      'relative',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: '#A855F7', fontVariantNumeric: 'tabular-nums' }}>
          Tour {index + 1}
        </span>
        <button
          onClick={onClose}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)', fontSize: 16, lineHeight: 1, padding: 2 }}
          aria-label="Fermer"
        >
          ✕
        </button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 24px' }}>
        {rows.map(({ label, value }) => (
          <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
            <span style={{ fontSize: 11, color: 'var(--text-dim)', whiteSpace: 'nowrap' }}>{label}</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', fontVariantNumeric: 'tabular-nums', textAlign: 'right' }}>
              {value}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────
export function LapsBikeChart({ activityId, cachedLaps, avgWatts, streams }: Props) {
  const [laps,        setLaps]        = useState<LapData[]>(cachedLaps && cachedLaps.length > 1 ? cachedLaps : [])
  const [loading,     setLoading]     = useState(!cachedLaps || cachedLaps.length <= 1)
  const [error,       setError]       = useState<string | null>(null)
  const [selectedLap, setSelectedLap] = useState<number | null>(null)
  const [hoveredLap,  setHoveredLap]  = useState<number | null>(null)

  useEffect(() => {
    if (cachedLaps && cachedLaps.length > 1) { console.log('[Laps] cache:', cachedLaps.length, 'tours'); return }
    fetch(`/api/strava/activity-laps?activity_id=${activityId}`)
      .then(r => r.json())
      .then((data: { laps?: LapData[]; error?: string }) => {
        console.log('[Laps] réponse:', { laps: data.laps?.length ?? 0, error: data.error })
        if (data.error) { setError(data.error); return }
        setLaps(data.laps ?? [])
      })
      .catch((e) => { console.error('[Laps] fetch échoué', e); setError('fetch') })
      .finally(() => setLoading(false))
  }, [activityId, cachedLaps])

  // Watts max par tour = MAX du stream watts entre start_index et end_index
  const wattsStream = streams?.watts ?? null
  const lapMaxWatts = (lap: LapData): number | null => {
    if (!wattsStream || lap.start_index == null || lap.end_index == null) return null
    let mx = 0
    for (let i = lap.start_index; i <= lap.end_index && i < wattsStream.length; i++) {
      const v = wattsStream[i]
      if (typeof v === 'number' && v > mx) mx = v
    }
    return mx > 0 ? mx : null
  }

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
          {error === 'not_connected' ? 'Connecte Strava pour voir les tours' : 'Aucun tour enregistré'}
        </div>
      </div>
    )
  }

  // 0 ou 1 tour → message clair (pas de graphe)
  if (laps.length <= 1) {
    return (
      <div style={{ marginBottom: 32, paddingTop: 8 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-dim)', letterSpacing: 0.9,
          textTransform: 'uppercase', marginBottom: 10, borderBottom: '1px solid var(--border)', paddingBottom: 5 }}>
          Tours
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-dim)', padding: '8px 0' }}>Aucun tour enregistré</div>
      </div>
    )
  }
  const hasWatts = laps.some(l => (l.avg_watts ?? 0) > 0)
  if (!hasWatts) return null

  // ── SVG chart constants ────────────────────────────────────────────────
  const N       = laps.length
  const PAD_L   = 44   // Y-axis labels
  const PAD_R   = 8
  const PAD_T   = 8
  const PAD_B   = 24   // X-axis labels
  const CH      = 150  // chart height
  const SLOT_W  = Math.max(28, Math.min(60, Math.floor(560 / N)))
  const BAR_W   = Math.max(10, SLOT_W - 6)
  const SVG_W   = PAD_L + N * SLOT_W + PAD_R
  const SVG_H   = PAD_T + CH + PAD_B

  const maxW = Math.max(...laps.map(l => l.avg_watts ?? 0)) * 1.05 || 1

  // Y-axis grid lines (every 50W)
  const yStep = maxW > 400 ? 100 : maxW > 200 ? 50 : 25
  const yLabels: number[] = []
  for (let w = 0; w <= maxW; w += yStep) yLabels.push(Math.round(w))

  const yOf = (w: number) => PAD_T + CH - (w / maxW) * CH
  const xOf = (i: number) => PAD_L + i * SLOT_W + (SLOT_W - BAR_W) / 2

  // Avg watts dashed line
  const avgY = avgWatts != null ? yOf(avgWatts) : null

  return (
    <div style={{ marginBottom: 32, paddingTop: 8 }}>
      {/* Section header */}
      <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-dim)', letterSpacing: 0.9,
        textTransform: 'uppercase', marginBottom: 16, borderBottom: '1px solid var(--border)',
        paddingBottom: 5 }}>
        Tours · {N}
      </div>

      {/* SVG chart */}
      <div style={{ overflowX: 'auto' }}>
        <svg
          viewBox={`0 0 ${SVG_W} ${SVG_H}`}
          style={{ width: '100%', minWidth: SVG_W > 400 ? undefined : SVG_W, height: SVG_H, display: 'block' }}
          preserveAspectRatio="xMinYMid meet"
        >
          {/* Y-axis grid + labels */}
          {yLabels.map(w => {
            const y = yOf(w)
            return (
              <g key={w}>
                <line x1={PAD_L} y1={y} x2={PAD_L + N * SLOT_W} y2={y}
                  stroke="var(--border)" strokeWidth="0.5" strokeDasharray={w === 0 ? '' : '2 3'} />
                <text x={PAD_L - 4} y={y + 3.5} textAnchor="end"
                  fontSize="9" fill="var(--text-dim)" style={{ fontVariantNumeric: 'tabular-nums' }}>
                  {w}
                </text>
              </g>
            )
          })}

          {/* W label */}
          <text x={6} y={PAD_T + CH / 2} textAnchor="middle" fontSize="9" fill="var(--text-dim)"
            transform={`rotate(-90, 6, ${PAD_T + CH / 2})`}>W</text>

          {/* Average watts line */}
          {avgY !== null && (
            <line x1={PAD_L} y1={avgY} x2={PAD_L + N * SLOT_W} y2={avgY}
              stroke="#475569" strokeWidth="1" strokeDasharray="4 3" />
          )}

          {/* Bars */}
          {laps.map((lap, i) => {
            const w   = lap.avg_watts ?? 0
            const bH  = w > 0 ? Math.max(2, (w / maxW) * CH) : 2
            const bY  = yOf(w)
            const bX  = xOf(i)
            const sel = selectedLap === i
            const hov = hoveredLap === i
            const fill = sel ? '#7C3AED' : hov ? '#9333EA' : '#A855F7'

            return (
              <g
                key={i}
                onClick={() => setSelectedLap(sel ? null : i)}
                onMouseEnter={() => setHoveredLap(i)}
                onMouseLeave={() => setHoveredLap(null)}
                style={{ cursor: 'pointer' }}
              >
                {/* Invisible hit area */}
                <rect x={PAD_L + i * SLOT_W} y={PAD_T} width={SLOT_W} height={CH}
                  fill="transparent" />
                {/* Bar */}
                <rect
                  x={bX} y={bY} width={BAR_W} height={bH}
                  fill={fill}
                  rx={sel ? 3 : 2}
                  style={{ transition: 'fill 0.15s' }}
                />
                {/* Watts label on top of bar (if bar is tall enough) */}
                {bH > 18 && w > 0 && (
                  <text x={bX + BAR_W / 2} y={bY - 3} textAnchor="middle"
                    fontSize="8" fill="#A855F7" fontWeight="600" style={{ fontVariantNumeric: 'tabular-nums' }}>
                    {Math.round(w)}
                  </text>
                )}
                {/* Tour label below */}
                <text x={PAD_L + i * SLOT_W + SLOT_W / 2} y={PAD_T + CH + PAD_B - 6}
                  textAnchor="middle" fontSize="9" fill={sel ? '#A855F7' : 'var(--text-dim)'}>
                  T{i + 1}
                </text>
              </g>
            )
          })}
        </svg>
      </div>

      {/* Detail panel */}
      {selectedLap !== null && laps[selectedLap] && (
        <LapDetailPanel
          lap={laps[selectedLap]}
          index={selectedLap}
          maxWatts={lapMaxWatts(laps[selectedLap])}
          onClose={() => setSelectedLap(null)}
        />
      )}
    </div>
  )
}
