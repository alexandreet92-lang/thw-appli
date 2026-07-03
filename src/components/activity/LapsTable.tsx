'use client'

import { useI18n } from '@/lib/i18n'

interface LapEntry {
  start_index?:    number
  end_index?:      number
  moving_time_s:   number
  avg_watts?:      number | null
  max_watts?:      number | null
  avg_hr?:         number | null
  max_heartrate?:  number | null
  avg_cadence?:    number | null
  avg_speed_ms?:   number | null
  distance_m:      number
}

interface StreamsPartial {
  temp?: number[]
}

interface Props {
  laps:        LapEntry[]
  streams:     StreamsPartial | null
  sport:       string
  maxHrEst:    number
  hoveredLap:  number | null
  onHoverLap:  (i: number | null) => void
}

function fmtDur(s: number | null | undefined): string {
  if (!s || s <= 0) return '—'
  const h   = Math.floor(s / 3600)
  const m   = Math.floor((s % 3600) / 60)
  const sec = Math.floor(s % 60)
  if (h > 0) return `${h}h${String(m).padStart(2, '0')}`
  if (sec > 0) return `${m}min${String(sec).padStart(2, '0')}`
  return `${m}min`
}

function fmtDist(meters: number): string {
  if (meters >= 1000) return `${(meters / 1000).toFixed(meters >= 10000 ? 0 : 2)} km`
  return `${Math.round(meters)} m`
}

function lapAvgTemp(streams: StreamsPartial | null, startIdx: number, endIdx: number): number | null {
  if (!streams?.temp) return null
  const slice = streams.temp.slice(startIdx, endIdx + 1)
  if (!slice.length) return null
  return slice.reduce((a, b) => a + b, 0) / slice.length
}

export function LapsTable({ laps, streams, maxHrEst, hoveredLap, onHoverLap }: Props) {
  const { t } = useI18n()
  // Median watts for recovery lap detection
  const validWatts = laps.map(l => l.avg_watts ?? 0).filter(w => w > 50)
  const sorted = [...validWatts].sort((a, b) => a - b)
  const medianWatts = sorted.length ? sorted[Math.floor(sorted.length / 2)] : 0

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <thead>
          <tr style={{ background: 'var(--bg-card2)' }}>
            {[t('activities.colLap'), 'Km', t('activities.duration'), t('activities.wattsAvg'), t('activities.hrAvg'), t('activities.hrMax'), t('activities.cadence'), t('activities.temp'), 'EF'].map(col => (
              <th key={col} style={{
                padding:       '6px 10px',
                textAlign:     'left',
                fontSize:      10,
                fontWeight:    700,
                color:         'var(--text-dim)',
                textTransform: 'uppercase',
                letterSpacing: 0.7,
                whiteSpace:    'nowrap',
              }}>
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {laps.map((lap, i) => {
            const isRecov   = medianWatts > 0 && (lap.avg_watts ?? 0) < medianWatts * 0.6
            const isHov     = hoveredLap === i
            const sIdx      = lap.start_index ?? 0
            const eIdx      = lap.end_index ?? (streams?.temp ? streams.temp.length - 1 : sIdx)
            const temp      = lapAvgTemp(streams, sIdx, eIdx)
            const ef        = lap.avg_watts != null && lap.avg_hr != null && lap.avg_hr > 0
              ? (lap.avg_watts / lap.avg_hr).toFixed(2)
              : null
            const hrMaxPct  = lap.max_heartrate != null
              ? Math.round((lap.max_heartrate / maxHrEst) * 100)
              : null

            const rowBg = isHov
              ? 'rgba(129,140,248,0.08)'
              : i % 2 === 0 ? 'var(--bg)' : 'var(--bg-card2)'

            const tdBase: React.CSSProperties = { padding: '7px 10px', whiteSpace: 'nowrap' }

            return (
              <tr
                key={i}
                onMouseEnter={() => onHoverLap(i)}
                onMouseLeave={() => onHoverLap(null)}
                style={{
                  background:  rowBg,
                  borderLeft:  isHov ? '3px solid #818CF8' : '3px solid transparent',
                  opacity:     isRecov ? 0.45 : 1,
                  transition:  'background 0.1s, opacity 0.1s',
                  cursor:      'default',
                }}
              >
                <td style={{ ...tdBase, color: 'var(--text-dim)', fontWeight: 700 }}>
                  {i + 1}
                </td>
                <td style={{ ...tdBase, color: 'var(--text)' }}>
                  {fmtDist(lap.distance_m)}
                </td>
                <td style={{ ...tdBase, color: 'var(--text)' }}>
                  {fmtDur(lap.moving_time_s)}
                </td>
                <td style={{ ...tdBase, color: '#818CF8', fontWeight: 600 }}>
                  {lap.avg_watts != null ? `${Math.round(lap.avg_watts)} W` : '—'}
                </td>
                <td style={{ ...tdBase, color: 'var(--text)' }}>
                  {lap.avg_hr != null ? `${Math.round(lap.avg_hr)} bpm` : '—'}
                </td>
                <td style={{ ...tdBase, color: hrMaxPct != null && hrMaxPct > 90 ? '#EF4444' : 'var(--text)' }}>
                  {lap.max_heartrate != null ? `${Math.round(lap.max_heartrate)} bpm` : '—'}
                </td>
                <td style={{ ...tdBase, color: 'var(--text)' }}>
                  {lap.avg_cadence != null ? `${Math.round(lap.avg_cadence)} rpm` : '—'}
                </td>
                <td style={{ ...tdBase, color: 'var(--text)' }}>
                  {temp != null ? `${Math.round(temp)}°C` : '—'}
                </td>
                <td style={{ ...tdBase, color: ef != null && parseFloat(ef) > 1.5 ? '#10B981' : 'var(--text)' }}>
                  {ef ?? '—'}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
