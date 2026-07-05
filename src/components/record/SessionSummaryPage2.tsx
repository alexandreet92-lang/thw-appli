'use client'
import type { FinishedSession } from '@/types/session'
import { formatPace, speedToMinKm } from '@/types/running'
import { useI18n } from '@/lib/i18n'

interface ThemeColors { bg: string; text: string; dim: string; separator: string }

function formatDuration(sec: number): string {
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = sec % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${m}:${String(s).padStart(2, '0')}`
}

interface Props {
  session: FinishedSession
  theme: ThemeColors
  dataFontFamily: string
}

export default function SessionSummaryPage2({ session, theme, dataFontFamily }: Props) {
  const { t } = useI18n()
  const maxAlt = session.gps_points.length
    ? Math.max(...session.gps_points.map(p => p.altitude ?? -Infinity).filter(a => a !== -Infinity))
    : null
  const minAlt = session.gps_points.length
    ? Math.min(...session.gps_points.map(p => p.altitude ?? Infinity).filter(a => a !== Infinity))
    : null

  const isRunning = session.sport === 'running' || session.sport === 'trail'
  const isTrail   = session.sport === 'trail'

  // Avg pace for running
  const avgSpeedKmh = session.duration_seconds > 0 ? (session.distance_m / 1000) / (session.duration_seconds / 3600) : 0
  const avgPaceVal  = speedToMinKm(avgSpeedKmh)
  const maxPaceVal  = speedToMinKm(session.max_speed_kmh)

  const runningStats: { label: string; value: string; unit: string; dim?: boolean }[] = [
    { label: t('record.sessionP2PaceAvg'),   value: avgPaceVal != null ? formatPace(avgPaceVal) : '--',   unit: 'min/km' },
    { label: t('record.sessionP2PaceMax'),    value: maxPaceVal != null ? formatPace(maxPaceVal) : '--',   unit: 'min/km' },
    { label: t('record.sessionP2VapAvg'),   value: '--',                                                  unit: 'min/km', dim: true },
    { label: t('record.sessionP2HrAvg'),    value: '--',                                                  unit: 'bpm',    dim: true },
    { label: t('record.sessionP2CadenceAvg'),  value: '--',                                                  unit: 'spm',    dim: true },
    { label: t('record.sessionP2Vo2max'),   value: '--',                                                  unit: 'ml/kg',  dim: true },
    { label: t('record.sessionP2Calories'),      value: String(session.calories),                             unit: 'kcal' },
    { label: t('record.sessionP2SpeedMax'),   value: session.max_speed_kmh.toFixed(1),                    unit: 'km/h' },
    { label: t('record.sessionP2AltMax'),      value: maxAlt != null && isFinite(maxAlt) ? String(Math.round(maxAlt)) : '--', unit: 'm' },
    { label: t('record.sessionP2AltMin'),      value: minAlt != null && isFinite(minAlt) ? String(Math.round(minAlt)) : '--', unit: 'm' },
    { label: t('record.sessionP2MovingTime'),    value: formatDuration(session.duration_seconds),             unit: '' },
    { label: t('record.sessionP2Stride'),        value: '--',                                                  unit: 'm',      dim: true },
  ]

  const cyclingStats: { label: string; value: string; unit: string; dim?: boolean }[] = [
    { label: t('record.sessionP2WattsAvg'),   value: '--',                                          unit: 'w',    dim: true },
    { label: t('record.sessionP2WattsNorm'),   value: '--',                                          unit: 'w',    dim: true },
    { label: t('record.sessionP2HrAvg'),   value: '--',                                          unit: 'bpm',  dim: true },
    { label: t('record.sessionP2HrMax'),       value: '--',                                          unit: 'bpm',  dim: true },
    { label: 'SM',           value: '--',                                          unit: '',     dim: true },
    { label: 'IF',           value: '--',                                          unit: '',     dim: true },
    { label: t('record.sessionP2SpeedMax'),  value: session.max_speed_kmh.toFixed(1),             unit: 'km/h' },
    { label: t('record.sessionP2Calories'),     value: String(session.calories),                     unit: 'kcal' },
    { label: t('record.sessionP2AltMax'),     value: maxAlt != null && isFinite(maxAlt) ? String(Math.round(maxAlt)) : '--', unit: 'm' },
    { label: t('record.sessionP2AltMin'),     value: minAlt != null && isFinite(minAlt) ? String(Math.round(minAlt)) : '--', unit: 'm' },
    { label: t('record.sessionP2MovingTime'),   value: formatDuration(session.duration_seconds),     unit: '' },
    { label: t('record.sessionP2Cadence'),      value: '--',                                          unit: 'rpm',  dim: true },
  ]

  // Trail-specific uphill/downhill pace from GPS points
  let uphillPaceVal: number | null = null
  let downhillPaceVal: number | null = null
  if (isTrail && session.gps_points.length > 1) {
    let uphillSpeedSum = 0, uphillCount = 0, downhillSpeedSum = 0, downhillCount = 0
    for (let i = 1; i < session.gps_points.length; i++) {
      const prev = session.gps_points[i - 1], cur = session.gps_points[i]
      if (prev.altitude == null || cur.altitude == null || cur.speed == null || cur.speed <= 0) continue
      const dt = (cur.timestamp - prev.timestamp) / 1000
      if (dt <= 0 || dt > 30) continue
      const dAlt = cur.altitude - prev.altitude
      const dLat = (cur.lat - prev.lat) * 111000
      const dLng = (cur.lng - prev.lng) * 111000 * Math.cos(cur.lat * Math.PI / 180)
      const dist = Math.sqrt(dLat * dLat + dLng * dLng)
      if (dist < 1) continue
      const gradient = (dAlt / dist) * 100
      const speedKmh = cur.speed * 3.6
      if (gradient > 2) { uphillSpeedSum += speedKmh; uphillCount++ }
      if (gradient < -2) { downhillSpeedSum += speedKmh; downhillCount++ }
    }
    if (uphillCount > 0) uphillPaceVal = speedToMinKm(uphillSpeedSum / uphillCount)
    if (downhillCount > 0) downhillPaceVal = speedToMinKm(downhillSpeedSum / downhillCount)
  }

  const trailStats: { label: string; value: string; unit: string; dim?: boolean }[] = [
    { label: t('record.sessionP2PaceAvg'),    value: avgPaceVal != null ? formatPace(avgPaceVal) : '--',          unit: 'min/km' },
    { label: t('record.sessionP2VapAvg'),    value: '--',                                                         unit: 'min/km', dim: true },
    { label: t('record.sessionP2PaceUphill'),  value: uphillPaceVal != null ? formatPace(uphillPaceVal) : '--',    unit: 'min/km' },
    { label: t('record.sessionP2PaceDownhill'),value: downhillPaceVal != null ? formatPace(downhillPaceVal) : '--', unit: 'min/km' },
    { label: t('record.sessionP2HrAvg'),     value: '--',                                                         unit: 'bpm',    dim: true },
    { label: t('record.sessionP2HrMax'),         value: '--',                                                         unit: 'bpm',    dim: true },
    { label: t('record.sessionP2AltMax'),       value: maxAlt != null && isFinite(maxAlt) ? String(Math.round(maxAlt)) : '--', unit: 'm' },
    { label: t('record.sessionP2Calories'),       value: String(session.calories),                                    unit: 'kcal' },
    { label: t('record.sessionP2GainTotal'),       value: String(Math.round(session.elevation_gain_m)),                unit: 'm' },
    { label: t('record.sessionP2LossTotal'),       value: String(Math.round(session.elevation_loss_m ?? 0)),           unit: 'm' },
    { label: t('record.sessionP2MovingTime'),     value: formatDuration(session.duration_seconds),                    unit: '' },
    { label: t('record.sessionP2SpeedMax'),    value: session.max_speed_kmh.toFixed(1),                           unit: 'km/h' },
  ]

  const stats = isTrail ? trailStats : isRunning ? runningStats : cyclingStats

  const hasDimStats = stats.some(s => s.dim)

  return (
    <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 24 }}>
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
        gap: 1, background: theme.separator,
        border: `1px solid ${theme.separator}`,
        borderRadius: 16, overflow: 'hidden', margin: '16px 16px 0',
      }}>
        {stats.map((s, i) => (
          <div key={i} style={{
            padding: '12px 8px', background: theme.bg, textAlign: 'center',
            opacity: s.dim ? 0.45 : 1,
          }}>
            <p style={{ fontSize: 9, color: theme.dim, textTransform: 'uppercase', letterSpacing: '1.2px', margin: '0 0 4px' }}>
              {s.label}
            </p>
            <p style={{ fontSize: 22, fontWeight: 700, color: theme.text, margin: 0, lineHeight: 1, fontFamily: dataFontFamily }}>
              {s.value}
            </p>
            {s.unit && (
              <p style={{ fontSize: 10, color: theme.dim, margin: '2px 0 0' }}>{s.unit}</p>
            )}
          </div>
        ))}
      </div>

      {hasDimStats && (
        <p style={{ margin: '16px 16px 0', fontSize: 12, color: theme.dim, lineHeight: 1.5, textAlign: 'center' }}>
          {t('record.sessionP2SensorUnavailable')}
        </p>
      )}
    </div>
  )
}
