'use client'

// ══════════════════════════════════════════════════════════════════
// RunningLapsSection — tours running INLINE (pas de slide).
// Graphique en barres vertes (hauteur ∝ vitesse → allure, largeur ∝
// durée), profil FC en surimpression, ligne d'allure moyenne, label
// d'allure au-dessus de chaque barre. Tableau détaillé sous le
// graphique (Tour/Km/Durée/Allure/FC moy/FC max/Cadence/Temp/EF).
// ══════════════════════════════════════════════════════════════════

import { useState, useEffect } from 'react'
import { formatPace, speedMsToPace } from '@/lib/utils/pace'

interface LapData {
  lap_index?:        number
  start_index?:      number
  end_index?:        number
  distance_m:        number
  moving_time_s:     number
  avg_hr?:           number | null
  max_heartrate?:    number | null
  avg_speed_ms?:     number | null
  avg_cadence?:      number | null
  elevation_gain_m?: number | null
  temp_avg?:         number | null
}
interface Streams { heartrate?: number[] | null }

interface Props {
  activityId:  string
  cachedLaps?: LapData[] | null
  streams?:    Streams | null
  avgSpeedMs?: number | null
}

function fmtDur(s: number): string {
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = Math.floor(s % 60)
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
  return `${m}:${String(sec).padStart(2, '0')}`
}
function lapSpeedMs(l: LapData): number {
  if (l.avg_speed_ms && l.avg_speed_ms > 0) return l.avg_speed_ms
  if (l.distance_m > 0 && l.moving_time_s > 0) return l.distance_m / l.moving_time_s
  return 0
}

const GREEN = '#10b981', RED = '#ef4444', ORANGE = '#f97316'

export function RunningLapsSection({ activityId, cachedLaps, streams, avgSpeedMs }: Props) {
  const [laps,    setLaps]    = useState<LapData[]>(cachedLaps && cachedLaps.length > 1 ? cachedLaps : [])
  const [loading, setLoading] = useState(!cachedLaps || cachedLaps.length <= 1)
  const [hover,   setHover]   = useState<number | null>(null)

  useEffect(() => {
    if (cachedLaps && cachedLaps.length > 1) return
    fetch(`/api/strava/activity-laps?activity_id=${activityId}`)
      .then(r => r.json())
      .then((d: { laps?: LapData[] }) => setLaps(d.laps ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [activityId, cachedLaps])

  if (loading) return null
  if (laps.length <= 1) return null

  const N = laps.length
  const speeds = laps.map(lapSpeedMs)
  const hasSpeed = speeds.some(s => s > 0)
  if (!hasSpeed) return null

  // Allure moyenne pondérée (pour la ligne pointillée).
  const avgSpd = avgSpeedMs && avgSpeedMs > 0
    ? avgSpeedMs
    : (() => { const d = laps.reduce((a, l) => a + l.distance_m, 0), t = laps.reduce((a, l) => a + l.moving_time_s, 0); return t > 0 ? d / t : 0 })()
  const avgPace = avgSpd > 0 ? speedMsToPace(avgSpd) : 0

  // ── Graphique ──────────────────────────────────────────────────────────
  const VBW = 1000, PAD_T = 22, PAD_B = 22, CH = 150, GAP = 2
  const SVG_H = PAD_T + CH + PAD_B
  const innerW = VBW - 8
  const totalTime = laps.reduce((s, l) => s + Math.max(0, l.moving_time_s || 0), 0) || 1
  const widths = laps.map(l => Math.max(3, (Math.max(0, l.moving_time_s || 0) / totalTime) * (innerW - (N - 1) * GAP)))
  const xs: number[] = []; { let c = 4; for (let i = 0; i < N; i++) { xs.push(c); c += widths[i] + GAP } }
  const maxSpd = Math.max(...speeds) * 1.05 || 1
  const yOf = (sp: number) => PAD_T + CH - (sp / maxSpd) * CH
  const avgY = avgSpd > 0 ? yOf(avgSpd) : null

  // Profil FC : un point par tour (avg_hr), normalisé sur sa propre échelle.
  const hrs = laps.map(l => l.avg_hr ?? 0)
  const hasHr = hrs.some(h => h > 0)
  const hrMin = Math.min(...hrs.filter(h => h > 0)), hrMax = Math.max(...hrs)
  const hrRange = (hrMax - hrMin) || 1
  const hrPath = hasHr
    ? laps.map((l, i) => {
        const h = l.avg_hr ?? 0
        const x = xs[i] + widths[i] / 2
        const y = PAD_T + CH - (h > 0 ? ((h - hrMin) / hrRange) * (CH * 0.8) + CH * 0.1 : 0)
        return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`
      }).join(' ')
    : ''

  const labelStep = N <= 12 ? 1 : N <= 24 ? 2 : Math.ceil(N / 12)

  return (
    <div style={{ marginBottom: 32, paddingTop: 24 }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-dim)', letterSpacing: 0.9, textTransform: 'uppercase', marginBottom: 16, borderBottom: '1px solid var(--border)', paddingBottom: 5 }}>
        Tours · {N}
      </div>

      <svg viewBox={`0 0 ${VBW} ${SVG_H}`} style={{ width: '100%', height: 'auto', display: 'block', touchAction: 'manipulation' }} preserveAspectRatio="xMidYMid meet">
        {avgY !== null && (
          <line x1={4} y1={avgY} x2={VBW - 4} y2={avgY} stroke="#475569" strokeWidth="1" strokeDasharray="4 3" vectorEffect="non-scaling-stroke" />
        )}
        {laps.map((l, i) => {
          const sp = speeds[i]
          const bH = sp > 0 ? Math.max(2, (sp / maxSpd) * CH) : 2
          const bY = yOf(sp), bX = xs[i], bW = widths[i]
          const isHover = hover === i
          const showLabel = bW >= 22 && sp > 0
          const showTick = i % labelStep === 0 || i === N - 1
          return (
            <g key={i} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} style={{ cursor: 'default' }}>
              <rect x={bX} y={PAD_T} width={bW + GAP} height={CH} fill="transparent" />
              <rect x={bX} y={bY} width={bW} height={bH} fill={GREEN} fillOpacity={isHover ? 1 : 0.85} rx={1.5} />
              {showLabel && (
                <text x={bX + bW / 2} y={bY - 4} textAnchor="middle" fontSize="9" fill="#059669" fontWeight="600"
                  style={{ fontVariantNumeric: 'tabular-nums', fontFamily: 'Barlow Condensed, sans-serif' }}>
                  {formatPace(speedMsToPace(sp))}
                </text>
              )}
              {showTick && (
                <text x={bX + bW / 2} y={SVG_H - 6} textAnchor="middle" fontSize="10" fill="var(--text-dim)"
                  style={{ fontVariantNumeric: 'tabular-nums', fontFamily: 'Barlow Condensed, sans-serif' }}>{i + 1}</text>
              )}
            </g>
          )
        })}
        {/* Profil FC en surimpression */}
        {hrPath && <path d={hrPath} fill="none" stroke="#64748b" strokeWidth="1.5" strokeLinejoin="round" vectorEffect="non-scaling-stroke" opacity={0.8} />}
      </svg>

      {/* Légende */}
      <div style={{ display: 'flex', gap: 16, margin: '6px 0 14px', fontSize: 10, color: 'var(--text-dim)' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><span style={{ width: 10, height: 10, borderRadius: 2, background: GREEN }} />Allure (rapide = haut)</span>
        {hasHr && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><span style={{ width: 12, height: 2, background: '#64748b' }} />FC moy.</span>}
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><span style={{ width: 12, height: 2, background: '#475569', borderTop: '1px dashed' }} />Allure moy. {avgPace > 0 ? `${formatPace(avgPace)}/km` : ''}</span>
      </div>

      {/* Tableau détaillé */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', minWidth: 700, borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ textAlign: 'left', color: 'var(--text-dim)' }}>
              {['Tour', 'Km', 'Durée', 'Allure', 'FC moy', 'FC max', 'Cadence', 'Temp', 'EF'].map(h => (
                <th key={h} style={{ padding: '4px 10px 8px 0', fontWeight: 600, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {laps.map((l, i) => {
              const sp = speeds[i]
              const pace = sp > 0 ? speedMsToPace(sp) : 0
              const slow = avgPace > 0 && pace > avgPace
              const ef = l.avg_hr && l.avg_hr > 0 && sp > 0 ? (sp / l.avg_hr) : null
              const isHover = hover === i
              return (
                <tr key={i}
                  onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}
                  style={{ borderTop: '1px solid var(--border)', background: isHover ? 'var(--bg-card2)' : 'transparent' }}>
                  <td style={{ padding: '6px 10px 6px 0', color: 'var(--text-dim)', fontVariantNumeric: 'tabular-nums' }}>{i + 1}</td>
                  <td style={{ padding: '6px 10px 6px 0', fontVariantNumeric: 'tabular-nums' }}>{(l.distance_m / 1000).toFixed(2).replace('.', ',')} km</td>
                  <td style={{ padding: '6px 10px 6px 0', fontVariantNumeric: 'tabular-nums' }}>{fmtDur(l.moving_time_s)}</td>
                  <td style={{ padding: '6px 10px 6px 0', fontWeight: 600, color: pace > 0 ? (slow ? RED : GREEN) : 'var(--text)', fontVariantNumeric: 'tabular-nums' }}>{pace > 0 ? `${formatPace(pace)}/km` : '—'}</td>
                  <td style={{ padding: '6px 10px 6px 0', color: ORANGE, fontVariantNumeric: 'tabular-nums' }}>{l.avg_hr ? `${Math.round(l.avg_hr)} bpm` : '—'}</td>
                  <td style={{ padding: '6px 10px 6px 0', color: ORANGE, fontVariantNumeric: 'tabular-nums' }}>{l.max_heartrate ? `${Math.round(l.max_heartrate)} bpm` : '—'}</td>
                  <td style={{ padding: '6px 10px 6px 0', fontVariantNumeric: 'tabular-nums' }}>{l.avg_cadence ? `${Math.round(l.avg_cadence)} spm` : '—'}</td>
                  <td style={{ padding: '6px 10px 6px 0', fontVariantNumeric: 'tabular-nums' }}>{l.temp_avg != null ? `${Math.round(l.temp_avg)} °C` : '—'}</td>
                  <td style={{ padding: '6px 10px 6px 0', fontVariantNumeric: 'tabular-nums' }}>{ef != null ? ef.toFixed(3) : '—'}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
