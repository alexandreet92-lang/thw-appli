'use client'
import { useI18n } from '@/lib/i18n'
import { LegacyCell as Cell, LegacyGrid } from './kit/LiveFrame'
import { distFactor, altFactor, getUnitLabel, SIZE_SCALE, type LiveUnits, type DataSize } from './units'

interface Props {
  isDark: boolean
  currentLapSec: number
  currentLapDistanceM: number
  avgSpeedKmh: number
  lapElevGainM: number
  lapElevLossM: number
  dataFontFamily?: string
  units?: LiveUnits
  dataSize?: DataSize
}

function fmt(sec: number): string {
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60
  if (h > 0) return `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
  return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
}


export default function MTBPage4({ isDark, currentLapSec, currentLapDistanceM, lapElevGainM, lapElevLossM, dataFontFamily, units, dataSize }: Props) {
  const { t } = useI18n()
  const font = dataFontFamily ?? '-apple-system, sans-serif'
  // Réglages Unités / Taille des données appliqués à l'affichage.
  const distF = distFactor(units)
  const altF  = altFactor(units)
  const mUnit = getUnitLabel('m', units)
  const sizes = SIZE_SCALE[dataSize ?? 'normal']
  const lapSpeedKmh = currentLapSec > 0 ? (currentLapDistanceM / currentLapSec) * 3.6 : 0
  return (
    <LegacyGrid>
      <Cell big isDark={isDark} font={font} sizes={sizes} label={t('record.commonLapDuration')} value={fmt(currentLapSec)} />
      <Cell isDark={isDark} font={font} sizes={sizes} label={t('record.mtbPage4LapDistance')} value={((currentLapDistanceM/1000) * distF).toFixed(2)} unit={getUnitLabel('km', units)} />
      <Cell isDark={isDark} font={font} sizes={sizes} label={t('record.mtbPage4LapSpeed')} value={(lapSpeedKmh * distF).toFixed(1)} unit={getUnitLabel('km/h', units)} />
      <Cell isDark={isDark} font={font} sizes={sizes} label="D+ lap" value={String(Math.round(lapElevGainM * altF))} unit={mUnit} />
      <Cell isDark={isDark} font={font} sizes={sizes} label="D- lap" value={String(Math.round(lapElevLossM * altF))} unit={mUnit} />
      <Cell isDark={isDark} font={font} sizes={sizes} label={t('record.commonHr')} value="--" unit="bpm" />
    </LegacyGrid>
  )
}
