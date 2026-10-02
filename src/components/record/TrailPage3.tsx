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
  lapElevGainM: number
  lapElevLossM: number
  dataFontFamily?: string
  units?: LiveUnits
  dataSize?: DataSize
}


export default function TrailPage3({ isDark, gradientPercent, elevationGainM, elevationLossM, altitudeM, lapElevGainM, lapElevLossM, dataFontFamily, units, dataSize }: Props) {
  const { t } = useI18n()
  const font = dataFontFamily ?? '-apple-system, sans-serif'
  // Réglages Unités / Taille des données appliqués à l'affichage.
  const altF  = altFactor(units)
  const mUnit = getUnitLabel('m', units)
  const sizes = SIZE_SCALE[dataSize ?? 'normal']
  return (
    <LegacyGrid>
      <Cell big isDark={isDark} font={font} sizes={sizes} label={t('record.trailGradient')} value={gradientPercent.toFixed(1)} unit="%" />
      <Cell isDark={isDark} font={font} sizes={sizes} label={t('record.trailElevGain')} value={String(Math.round(elevationGainM * altF))} unit={mUnit} />
      <Cell isDark={isDark} font={font} sizes={sizes} label={t('record.trailElevLoss')} value={String(Math.round(elevationLossM * altF))} unit={mUnit} />
      <Cell isDark={isDark} font={font} sizes={sizes} label={t('record.trailAltitude')} value={String(Math.round(altitudeM * altF))} unit={mUnit} />
      <Cell isDark={isDark} font={font} sizes={sizes} label={t('record.trailLapElevGain')} value={String(Math.round(lapElevGainM * altF))} unit={mUnit} />
      <Cell isDark={isDark} font={font} sizes={sizes} label={t('record.trailLapElevLoss')} value={String(Math.round(lapElevLossM * altF))} unit={mUnit} />
    </LegacyGrid>
  )
}
