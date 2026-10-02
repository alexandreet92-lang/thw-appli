'use client'
import { formatSeconds } from '@/hooks/useStopwatch'
import { useI18n } from '@/lib/i18n'
import { LegacyCell as Cell, LegacyGrid } from './kit/LiveFrame'
import { distFactor, altFactor, getUnitLabel, SIZE_SCALE, type LiveUnits, type DataSize } from './units'

interface Props {
  isDark: boolean
  durationSec: number
  speedKmh: number
  distanceM: number
  elevationGainM: number
  elevationLossM: number
  dataFontFamily?: string
  units?: LiveUnits
  dataSize?: DataSize
}

export default function MTBPage1({ durationSec, speedKmh, distanceM, elevationGainM, elevationLossM, dataFontFamily, units, dataSize }: Props) {
  const { t: tr } = useI18n()
  const font = dataFontFamily
  // Réglages Unités / Taille des données appliqués à l'affichage.
  const distF = distFactor(units)
  const altF  = altFactor(units)
  const sizes = SIZE_SCALE[dataSize ?? 'normal']
  const distanceKm = ((distanceM / 1000) * distF).toFixed(2)
  const kmUnit  = getUnitLabel('km', units)
  const kmhUnit = getUnitLabel('km/h', units)
  const mUnit   = getUnitLabel('m', units)

  return (
    <LegacyGrid>
      <Cell big font={font} sizes={sizes} label={tr('record.commonSpeed')} value={(speedKmh * distF).toFixed(1)} unit={kmhUnit} />
      <Cell font={font} sizes={sizes} label={tr('record.commonDuration')} value={formatSeconds(durationSec)} />
      <Cell font={font} sizes={sizes} label={tr('record.commonDistance')} value={distanceKm} unit={kmUnit} />
      <Cell font={font} sizes={sizes} label="D+" value={`${Math.round(elevationGainM * altF)}`} unit={mUnit} />
      <Cell font={font} sizes={sizes} label="D-" value={`${Math.round(elevationLossM * altF)}`} unit={mUnit} />
      <Cell font={font} sizes={sizes} label={tr('record.commonHr')} value="--" unit="bpm" />
      <Cell font={font} sizes={sizes} label={tr('record.commonAvgSpeedShort')} value={durationSec > 0 ? (((distanceM/1000)/(durationSec/3600)) * distF).toFixed(1) : '--'} unit={kmhUnit} />
    </LegacyGrid>
  )
}
