'use client'
import { ALL_RUNNING_FIELDS, formatPace, speedToMinKm, calculateVAP } from '@/types/running'
import type { DataPage } from '@/types/cycling'
import { useI18n } from '@/lib/i18n'

interface Props {
  page: DataPage
  isDark: boolean
  durationSec: number
  distanceM: number
  speedKmh: number
  elevationGainM: number
  altitudeM: number
  gradientPercent: number
  currentLapSec: number
  currentLapDistanceM: number
  dataFontFamily?: string
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
  return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
}

function getLiveValue(fieldId: string, p: Props): string {
  const avgSpeedKmh = p.durationSec > 0 ? (p.distanceM / p.durationSec) * 3.6 : 0
  const pace        = speedToMinKm(p.speedKmh)
  const avgPace     = speedToMinKm(avgSpeedKmh)
  const lapSpeedKmh = p.currentLapSec > 0 ? (p.currentLapDistanceM / p.currentLapSec) * 3.6 : 0
  const lapPace     = speedToMinKm(lapSpeedKmh)
  const vap         = pace != null ? calculateVAP(pace, p.gradientPercent) : null
  const avgVap      = avgPace != null ? calculateVAP(avgPace, p.gradientPercent) : null

  switch (fieldId) {
    case 'duration':
    case 'moving_time':       return formatDuration(p.durationSec)
    case 'lap_duration':
    case 'prev_lap_duration': return formatDuration(p.currentLapSec)
    case 'distance':          return (p.distanceM / 1000).toFixed(2)
    case 'lap_distance':
    case 'prev_lap_distance': return (p.currentLapDistanceM / 1000).toFixed(2)
    case 'pace':              return pace != null ? formatPace(pace) : '--'
    case 'avg_pace':          return avgPace != null ? formatPace(avgPace) : '--'
    case 'best_pace':         return pace != null ? formatPace(pace) : '--'
    case 'lap_pace':
    case 'prev_lap_pace':     return lapPace != null ? formatPace(lapPace) : '--'
    case 'vap':               return vap != null ? formatPace(vap) : '--'
    case 'avg_vap':           return avgVap != null ? formatPace(avgVap) : '--'
    case 'speed':             return p.speedKmh.toFixed(1)
    case 'avg_speed':         return avgSpeedKmh.toFixed(1)
    case 'elevation_gain':    return Math.round(p.elevationGainM).toString()
    case 'altitude':          return Math.round(p.altitudeM).toString()
    case 'gradient':          return p.gradientPercent.toFixed(1)
    case 'calories':          return Math.round(p.durationSec / 60 * 10).toString()
    default:                  return '--'
  }
}

export default function RunningPageData({ page, isDark, dataFontFamily, ...liveProps }: Props) {
  const { t } = useI18n()
  const text      = isDark ? '#FFFFFF' : '#0A0A0A'
  const dim       = isDark ? 'rgba(255,255,255,0.40)' : '#8C8C8C'
  const separator = isDark ? 'rgba(255,255,255,0.08)' : '#E8E8E8'
  const font      = dataFontFamily ?? '-apple-system, BlinkMacSystemFont, sans-serif'

  const bigFieldId  = page.bigFieldId ?? page.fields[0]
  const otherFields = page.fields.filter(f => f !== bigFieldId)
  const bigOnTop    = page.bigFieldPosition !== 'middle'
  const midIndex    = Math.floor(otherFields.length / 2)
  const allProps    = { page, isDark, dataFontFamily, ...liveProps }

  const renderBigCell = (fieldId: string) => {
    const field = ALL_RUNNING_FIELDS.find(f => f.id === fieldId)
    return (
      <div key={fieldId} style={{
        gridColumn: '1 / -1', padding: '20px 12px',
        borderBottom: `1px solid ${separator}`, textAlign: 'center',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4,
        minHeight: 100,
      }}>
        <p style={{ fontSize: 11, color: dim, textTransform: 'uppercase', letterSpacing: '1.5px', margin: 0 }}>
          {field?.labelKey ? t(field.labelKey) : field?.label}
        </p>
        <p style={{ fontSize: 56, fontWeight: 700, color: text, margin: 0, lineHeight: 1, fontFamily: font }}>
          {getLiveValue(fieldId, allProps)}
        </p>
        {field?.unit && <p style={{ fontSize: 14, color: dim, margin: 0 }}>{field.unit}</p>}
      </div>
    )
  }

  const renderSmallCell = (fieldId: string) => {
    const field = ALL_RUNNING_FIELDS.find(f => f.id === fieldId)
    return (
      <div key={fieldId} style={{
        padding: '14px 8px', textAlign: 'center',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3,
        borderRight: `1px solid ${separator}`, borderBottom: `1px solid ${separator}`, minHeight: 80,
      }}>
        <p style={{ fontSize: 10, color: dim, textTransform: 'uppercase', letterSpacing: '1.2px', margin: 0 }}>
          {field?.labelKey ? t(field.labelKey) : field?.label}
        </p>
        <p style={{ fontSize: 30, fontWeight: 700, color: text, margin: 0, lineHeight: 1, fontFamily: font }}>
          {getLiveValue(fieldId, allProps)}
        </p>
        {field?.unit && <p style={{ fontSize: 12, color: dim, margin: 0 }}>{field.unit}</p>}
      </div>
    )
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', flex: 1, alignContent: 'start' }}>
      {bigOnTop && renderBigCell(bigFieldId)}
      {bigOnTop && otherFields.map(renderSmallCell)}
      {!bigOnTop && otherFields.slice(0, midIndex).map(renderSmallCell)}
      {!bigOnTop && renderBigCell(bigFieldId)}
      {!bigOnTop && otherFields.slice(midIndex).map(renderSmallCell)}
    </div>
  )
}
