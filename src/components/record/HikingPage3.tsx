'use client'
import { useI18n } from '@/lib/i18n'
import { LegacyCell as Cell, LegacyGrid } from './kit/LiveFrame'
import { altFactor, getUnitLabel, SIZE_SCALE, type LiveUnits, type DataSize } from './units'

interface Props {
  isDark: boolean
  gradientPercent: number
  elevationGainM: number
  elevationLossM: number
  altitudeM: number
  distanceM: number
  dataFontFamily?: string
  units?: LiveUnits
  dataSize?: DataSize
}


export default function HikingPage3({ isDark, gradientPercent, elevationGainM, elevationLossM, altitudeM, distanceM, dataFontFamily, units, dataSize }: Props) {
  const { t } = useI18n()
  const font = dataFontFamily ?? '-apple-system, sans-serif'
  // Réglages Unités / Taille des données appliqués à l'affichage.
  const altF  = altFactor(units)
  const mUnit = getUnitLabel('m', units)
  const sizes = SIZE_SCALE[dataSize ?? 'normal']
  const avgGradient = distanceM > 0 ? (elevationGainM / distanceM) * 100 : 0
  return (
    <LegacyGrid>
      <Cell big isDark={isDark} font={font} sizes={sizes} label={t('record.commonCurrentGradient')} value={gradientPercent.toFixed(1)} unit="%" />
      <Cell isDark={isDark} font={font} sizes={sizes} label="D+" value={String(Math.round(elevationGainM * altF))} unit={mUnit} />
      <Cell isDark={isDark} font={font} sizes={sizes} label="D-" value={String(Math.round(elevationLossM * altF))} unit={mUnit} />
      <Cell isDark={isDark} font={font} sizes={sizes} label={t('record.commonAltitude')} value={String(Math.round(altitudeM * altF))} unit={mUnit} />
      <Cell isDark={isDark} font={font} sizes={sizes} label={t('record.hikingPage3AvgGradient')} value={avgGradient.toFixed(1)} unit="%" />
    </LegacyGrid>
  )
}
