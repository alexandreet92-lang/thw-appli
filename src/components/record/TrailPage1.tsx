'use client'
import { formatPace, speedToMinKm } from '@/types/trail'
import { LegacyCell as Cell, LegacyGrid } from './kit/LiveFrame'
import { useI18n } from '@/lib/i18n'
import { distFactor, altFactor, paceFactor, getUnitLabel, SIZE_SCALE, type LiveUnits, type PaceUnit, type DataSize } from './units'

interface Props {
  isDark: boolean
  durationSec: number
  distanceM: number
  speedKmh: number
  elevationGainM: number
  elevationLossM: number
  dataFontFamily?: string
  units?: LiveUnits
  paceUnit?: PaceUnit
  dataSize?: DataSize
}

function fmt(sec: number): string {
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60
  if (h > 0) return `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
  return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
}


export default function TrailPage1({ isDark, durationSec, distanceM, speedKmh, elevationGainM, elevationLossM, dataFontFamily, units, paceUnit, dataSize }: Props) {
  const { t } = useI18n()
  const font = dataFontFamily ?? '-apple-system, sans-serif'
  // Réglages Unités / Allure / Taille des données appliqués à l'affichage.
  const distF = distFactor(units)
  const altF  = altFactor(units)
  const paceF = paceFactor(paceUnit)
  const sizes = SIZE_SCALE[dataSize ?? 'normal']
  const avgSpeedKmh = durationSec > 0 ? (distanceM / durationSec) * 3.6 : 0
  const pace = speedToMinKm(speedKmh)
  const avgPace = speedToMinKm(avgSpeedKmh)
  return (
    <LegacyGrid>
      <Cell big isDark={isDark} font={font} sizes={sizes} label={t('record.trailPace')} value={pace != null ? formatPace(pace * paceF) : '--'} unit={getUnitLabel('min/km', units, paceUnit)} />
      <Cell isDark={isDark} font={font} sizes={sizes} label={t('record.trailDuration')} value={fmt(durationSec)} />
      <Cell isDark={isDark} font={font} sizes={sizes} label={t('record.trailDistance')} value={((distanceM/1000) * distF).toFixed(2)} unit={getUnitLabel('km', units)} />
      <Cell isDark={isDark} font={font} sizes={sizes} label={t('record.trailElevGain')} value={String(Math.round(elevationGainM * altF))} unit={getUnitLabel('m', units)} />
      <Cell isDark={isDark} font={font} sizes={sizes} label={t('record.trailElevLoss')} value={String(Math.round(elevationLossM * altF))} unit={getUnitLabel('m', units)} />
      <Cell isDark={isDark} font={font} sizes={sizes} label={t('record.trailAvgPace')} value={avgPace != null ? formatPace(avgPace * paceF) : '--'} unit={getUnitLabel('min/km', units, paceUnit)} />
    </LegacyGrid>
  )
}
