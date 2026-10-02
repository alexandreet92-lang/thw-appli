'use client'
import { useI18n } from '@/lib/i18n'
import { LegacyCell as Cell, LegacyGrid } from './kit/LiveFrame'
import { distFactor, altFactor, getUnitLabel, SIZE_SCALE, type LiveUnits, type DataSize } from './units'

interface Props {
  isDark: boolean
  durationSec: number
  speedKmh: number
  maxSpeedKmh: number
  distanceM: number
  elevationLossM: number
  altitudeM: number
  runCount: number
  dataFontFamily?: string
  units?: LiveUnits
  dataSize?: DataSize
}

function fmt(sec: number): string {
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60
  if (h > 0) return `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
  return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
}


export default function SkiPage1({ isDark, durationSec, speedKmh, maxSpeedKmh, distanceM, elevationLossM, altitudeM, runCount, dataFontFamily, units, dataSize }: Props) {
  const { t } = useI18n()
  const font = dataFontFamily ?? '-apple-system, sans-serif'
  // Réglages Unités / Taille des données appliqués à l'affichage.
  const distF = distFactor(units)
  const altF  = altFactor(units)
  const kmhUnit = getUnitLabel('km/h', units)
  const mUnit   = getUnitLabel('m', units)
  const sizes = SIZE_SCALE[dataSize ?? 'normal']
  return (
    <LegacyGrid>
      <Cell big isDark={isDark} font={font} sizes={sizes} label={t('record.skiSpeed')} value={(speedKmh * distF).toFixed(1)} unit={kmhUnit} />
      <Cell isDark={isDark} font={font} sizes={sizes} label={t('record.skiDuration')} value={fmt(durationSec)} />
      <Cell isDark={isDark} font={font} sizes={sizes} label={t('record.skiRuns')} value={String(runCount)} />
      <Cell isDark={isDark} font={font} sizes={sizes} label="D-" value={String(Math.round(elevationLossM * altF))} unit={mUnit} />
      <Cell isDark={isDark} font={font} sizes={sizes} label={t('record.skiAltitude')} value={String(Math.round(altitudeM * altF))} unit={mUnit} />
      <Cell isDark={isDark} font={font} sizes={sizes} label={t('record.skiMaxSpeed')} value={(maxSpeedKmh * distF).toFixed(1)} unit={kmhUnit} />
    </LegacyGrid>
  )
}
