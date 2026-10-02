'use client'
import { formatPace, speedToMinKm, calculateVAP } from '@/types/trail'
import { LegacyCell as Cell, LegacyGrid } from './kit/LiveFrame'
import { useI18n } from '@/lib/i18n'
import { distFactor, altFactor, paceFactor, getUnitLabel, SIZE_SCALE, type LiveUnits, type PaceUnit, type DataSize } from './units'

interface Props {
  isDark: boolean
  currentLapSec: number
  currentLapDistanceM: number
  gradientPercent: number
  lapElevGainM: number
  lapElevLossM: number
  dataFontFamily?: string
  units?: LiveUnits
  paceUnit?: PaceUnit
  dataSize?: DataSize
}

function fmt(sec: number): string {
  const m = Math.floor(sec / 60), s = sec % 60
  return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
}


export default function TrailPage4({ isDark, currentLapSec, currentLapDistanceM, gradientPercent, lapElevGainM, lapElevLossM, dataFontFamily, units, paceUnit, dataSize }: Props) {
  const { t } = useI18n()
  const font = dataFontFamily ?? '-apple-system, sans-serif'
  // Réglages Unités / Allure / Taille des données appliqués à l'affichage.
  const distF = distFactor(units)
  const altF  = altFactor(units)
  const paceF = paceFactor(paceUnit)
  const sizes = SIZE_SCALE[dataSize ?? 'normal']
  const lapSpeedKmh = currentLapSec > 0 ? (currentLapDistanceM / currentLapSec) * 3.6 : 0
  const lapPace = speedToMinKm(lapSpeedKmh)
  const vap = lapPace != null ? calculateVAP(lapPace, gradientPercent) : null
  return (
    <LegacyGrid>
      <Cell big isDark={isDark} font={font} sizes={sizes} label={t('record.trailLapPace')} value={lapPace != null ? formatPace(lapPace * paceF) : '--'} unit={getUnitLabel('min/km', units, paceUnit)} />
      <Cell isDark={isDark} font={font} sizes={sizes} label={t('record.trailLapDuration')} value={fmt(currentLapSec)} />
      <Cell isDark={isDark} font={font} sizes={sizes} label={t('record.trailLapDistance')} value={((currentLapDistanceM/1000) * distF).toFixed(2)} unit={getUnitLabel('km', units)} />
      <Cell isDark={isDark} font={font} sizes={sizes} label={t('record.trailLapElevGain')} value={String(Math.round(lapElevGainM * altF))} unit={getUnitLabel('m', units)} />
      <Cell isDark={isDark} font={font} sizes={sizes} label={t('record.trailLapElevLoss')} value={String(Math.round(lapElevLossM * altF))} unit={getUnitLabel('m', units)} />
      <Cell isDark={isDark} font={font} sizes={sizes} label={t('record.trailVap')} value={vap != null ? formatPace(vap * paceF) : '--'} unit={getUnitLabel('min/km', units, paceUnit)} />
    </LegacyGrid>
  )
}
