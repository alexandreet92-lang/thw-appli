'use client'
import { ALL_RUNNING_FIELDS, formatPace, speedToMinKm, calculateVAP } from '@/types/running'
import type { DataPage } from '@/types/cycling'
import { useI18n } from '@/lib/i18n'
import { LegacyCell, LegacyGrid } from './kit/LiveFrame'
import { distFactor, altFactor, paceFactor, getUnitLabel, SIZE_SCALE, type LiveUnits, type PaceUnit, type DataSize } from './units'

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
  units?: LiveUnits
  paceUnit?: PaceUnit
  dataSize?: DataSize
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
  return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
}

function getLiveValue(fieldId: string, p: Props): string {
  // Réglages Unités / Allure appliqués à l'affichage : km → mi, m → ft,
  // min/km → min/mi (les calculs internes restent métriques).
  const distF = distFactor(p.units)
  const altF  = altFactor(p.units)
  const paceF = paceFactor(p.paceUnit)
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
    case 'distance':          return ((p.distanceM / 1000) * distF).toFixed(2)
    case 'lap_distance':
    case 'prev_lap_distance': return ((p.currentLapDistanceM / 1000) * distF).toFixed(2)
    case 'pace':              return pace != null ? formatPace(pace * paceF) : '--'
    case 'avg_pace':          return avgPace != null ? formatPace(avgPace * paceF) : '--'
    case 'best_pace':         return pace != null ? formatPace(pace * paceF) : '--'
    case 'lap_pace':
    case 'prev_lap_pace':     return lapPace != null ? formatPace(lapPace * paceF) : '--'
    case 'vap':               return vap != null ? formatPace(vap * paceF) : '--'
    case 'avg_vap':           return avgVap != null ? formatPace(avgVap * paceF) : '--'
    case 'speed':             return (p.speedKmh * distF).toFixed(1)
    case 'avg_speed':         return (avgSpeedKmh * distF).toFixed(1)
    case 'elevation_gain':    return Math.round(p.elevationGainM * altF).toString()
    case 'altitude':          return Math.round(p.altitudeM * altF).toString()
    case 'gradient':          return p.gradientPercent.toFixed(1)
    case 'calories':          return Math.round(p.durationSec / 60 * 10).toString()
    default:                  return '--'
  }
}

export default function RunningPageData({ page, isDark, dataFontFamily, ...liveProps }: Props) {
  const { t } = useI18n()
  const font      = dataFontFamily

  const bigFieldId  = page.bigFieldId ?? page.fields[0]
  const otherFields = page.fields.filter(f => f !== bigFieldId)
  const bigOnTop    = page.bigFieldPosition !== 'middle'
  const midIndex    = Math.floor(otherFields.length / 2)
  const allProps    = { page, isDark, dataFontFamily, ...liveProps }
  // Réglage « Taille des données » appliqué aux tuiles.
  const sizes       = SIZE_SCALE[liveProps.dataSize ?? 'normal']

  const cell = (fieldId: string, big?: boolean) => {
    const field = ALL_RUNNING_FIELDS.find(f => f.id === fieldId)
    return (
      <LegacyCell key={fieldId} big={big} font={font} sizes={sizes}
        label={(field?.labelKey ? t(field.labelKey) : field?.label) ?? fieldId}
        value={getLiveValue(fieldId, allProps)}
        unit={field?.unit ? getUnitLabel(field.unit, liveProps.units, liveProps.paceUnit) : undefined} />
    )
  }

  return (
    <LegacyGrid>
      {bigOnTop && cell(bigFieldId, true)}
      {bigOnTop && otherFields.map(f => cell(f))}
      {!bigOnTop && otherFields.slice(0, midIndex).map(f => cell(f))}
      {!bigOnTop && cell(bigFieldId, true)}
      {!bigOnTop && otherFields.slice(midIndex).map(f => cell(f))}
    </LegacyGrid>
  )
}
