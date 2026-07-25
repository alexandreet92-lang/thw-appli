'use client'
import { ALL_FIELDS, type DataPage } from '@/types/cycling'
import { useI18n } from '@/lib/i18n'

export interface LiveUnits {
  distance: 'metric' | 'imperial'
  altitude: 'm' | 'ft'
}

interface Props {
  page: DataPage
  isDark: boolean
  durationSec: number
  distanceM: number
  speedKmh: number
  maxSpeedKmh?: number
  elevationGainM: number
  altitudeM: number
  gradientPercent?: number
  currentLapSec: number
  currentLapDistanceM: number
  dataFontFamily?: string
  units?: LiveUnits
  dataSize?: 'small' | 'normal' | 'large'
}

const KM_TO_MI = 0.621371
const M_TO_FT = 3.28084

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function getLiveValue(fieldId: string, p: Props): string {
  // Réglage Unités appliqué à l'affichage : km/km/h → mi/mph, m → ft.
  const distF = p.units?.distance === 'imperial' ? KM_TO_MI : 1
  const altF  = p.units?.altitude === 'ft' ? M_TO_FT : 1
  const avgSpeed = p.durationSec > 0 ? (p.distanceM / p.durationSec) * 3.6 : 0
  switch (fieldId) {
    case 'duration':
    case 'moving_time':      return formatDuration(p.durationSec)
    case 'lap_duration':
    case 'prev_lap_duration':return formatDuration(p.currentLapSec)
    case 'distance':         return ((p.distanceM / 1000) * distF).toFixed(2)
    case 'lap_distance':
    case 'prev_lap_distance':return ((p.currentLapDistanceM / 1000) * distF).toFixed(2)
    case 'speed':            return (p.speedKmh * distF).toFixed(1)
    case 'avg_speed':        return (avgSpeed * distF).toFixed(1)
    case 'max_speed':        return ((p.maxSpeedKmh ?? p.speedKmh) * distF).toFixed(1)
    case 'lap_speed':        return p.currentLapSec > 0
      ? ((p.currentLapDistanceM / p.currentLapSec) * 3.6 * distF).toFixed(1)
      : '0.0'
    case 'elevation_gain':   return Math.round(p.elevationGainM * altF).toString()
    case 'altitude':         return Math.round(p.altitudeM * altF).toString()
    case 'gradient':         return (p.gradientPercent ?? 0).toFixed(1)
    case 'calories':         return Math.round(p.durationSec / 60 * 8).toString()
    default:                 return '--'
  }
}

function getUnitLabel(unit: string | undefined, units?: LiveUnits): string | undefined {
  if (!unit) return unit
  if (units?.distance === 'imperial') {
    if (unit === 'km') return 'mi'
    if (unit === 'km/h') return 'mph'
  }
  if (units?.altitude === 'ft' && unit === 'm') return 'ft'
  return unit
}

// Réglage « Taille des données » appliqué aux tuiles.
const SIZE_SCALE: Record<'small' | 'normal' | 'large', { big: number; small: number }> = {
  small:  { big: 44, small: 24 },
  normal: { big: 56, small: 30 },
  large:  { big: 64, small: 34 },
}

export default function CyclingPageData({ page, isDark, dataFontFamily, ...liveProps }: Props) {
  const { t } = useI18n()
  const text       = isDark ? '#FFFFFF' : '#0A0A0A'
  const dim        = isDark ? 'rgba(255,255,255,0.38)' : '#8C8C8C'
  const separator  = isDark ? 'rgba(255,255,255,0.06)' : '#EFEFEF'
  const fontFamily = dataFontFamily ?? '-apple-system, BlinkMacSystemFont, sans-serif'

  const bigFieldId   = page.bigFieldId ?? page.fields[0]
  const otherFields  = page.fields.filter(f => f !== bigFieldId)
  const bigOnTop     = page.bigFieldPosition !== 'middle'
  const midIndex     = Math.floor(otherFields.length / 2)
  const allProps     = { page, isDark, dataFontFamily, ...liveProps }
  const sizes        = SIZE_SCALE[liveProps.dataSize ?? 'normal']

  const renderBigCell = (fieldId: string) => {
    const field = ALL_FIELDS.find(f => f.id === fieldId)
    return (
      <div
        key={fieldId}
        style={{
          gridColumn: '1 / -1',
          padding: '20px 12px',
          borderBottom: `1px solid ${separator}`,
          textAlign: 'center',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: 4,
          minHeight: 100,
        }}
      >
        <p style={{ fontSize: 10, fontWeight: 600, color: dim, textTransform: 'uppercase', letterSpacing: '0.16em', margin: 0 }}>
          {field?.labelKey ? t(field.labelKey) : field?.label}
        </p>
        <p style={{ fontSize: sizes.big, fontWeight: 700, color: text, margin: 0, lineHeight: 1, fontFamily, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.01em' }}>
          {getLiveValue(fieldId, allProps)}
        </p>
        {field?.unit && (
          <p style={{ fontSize: 13, fontWeight: 500, color: dim, margin: 0 }}>{getUnitLabel(field.unit, liveProps.units)}</p>
        )}
      </div>
    )
  }

  const renderSmallCell = (fieldId: string) => {
    const field = ALL_FIELDS.find(f => f.id === fieldId)
    return (
      <div
        key={fieldId}
        style={{
          padding: '14px 8px',
          textAlign: 'center',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: 3,
          borderRight: `1px solid ${separator}`,
          borderBottom: `1px solid ${separator}`,
          minHeight: 80,
        }}
      >
        <p style={{ fontSize: 9.5, fontWeight: 600, color: dim, textTransform: 'uppercase', letterSpacing: '0.14em', margin: 0 }}>
          {field?.labelKey ? t(field.labelKey) : field?.label}
        </p>
        <p style={{ fontSize: sizes.small, fontWeight: 700, color: text, margin: 0, lineHeight: 1, fontFamily, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.01em' }}>
          {getLiveValue(fieldId, allProps)}
        </p>
        {field?.unit && (
          <p style={{ fontSize: 11.5, fontWeight: 500, color: dim, margin: 0 }}>{getUnitLabel(field.unit, liveProps.units)}</p>
        )}
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
