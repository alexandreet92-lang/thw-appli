'use client'
import { useI18n } from '@/lib/i18n'
import { LegacyCell as Cell, LegacyGrid } from './kit/LiveFrame'
import { altFactor, getUnitLabel, SIZE_SCALE, type LiveUnits, type DataSize } from './units'

interface Props {
  isDark: boolean
  gradientPercent: number
  maxGradient: number
  elevationGainM: number
  elevationLossM: number
  lapElevGainM: number
  lapElevLossM: number
  avgSpeedKmh: number
  dataFontFamily?: string
  units?: LiveUnits
  dataSize?: DataSize
}


export default function MTBPage3({ isDark, gradientPercent, maxGradient, elevationGainM, elevationLossM, lapElevGainM, lapElevLossM, dataFontFamily, units, dataSize }: Props) {
  const { t } = useI18n()
  const font = dataFontFamily ?? '-apple-system, sans-serif'
  // Réglages Unités / Taille des données appliqués à l'affichage.
  const altF  = altFactor(units)
  const mUnit = getUnitLabel('m', units)
  const sizes = SIZE_SCALE[dataSize ?? 'normal']
  return (
    <LegacyGrid>
      <Cell big isDark={isDark} font={font} sizes={sizes} label={t('record.commonCurrentGradient')} value={gradientPercent.toFixed(1)} unit="%" />
      <Cell isDark={isDark} font={font} sizes={sizes} label={t('record.mtbPage3MaxGradient')} value={maxGradient.toFixed(1)} unit="%" />
      <Cell isDark={isDark} font={font} sizes={sizes} label="D+" value={String(Math.round(elevationGainM * altF))} unit={mUnit} />
      <Cell isDark={isDark} font={font} sizes={sizes} label="D-" value={String(Math.round(elevationLossM * altF))} unit={mUnit} />
      <Cell isDark={isDark} font={font} sizes={sizes} label="D+ lap" value={String(Math.round(lapElevGainM * altF))} unit={mUnit} />
      <Cell isDark={isDark} font={font} sizes={sizes} label="D- lap" value={String(Math.round(lapElevLossM * altF))} unit={mUnit} />
    </LegacyGrid>
  )
}
