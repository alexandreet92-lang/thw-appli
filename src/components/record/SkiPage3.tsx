'use client'
import type { SkiPhase } from '@/hooks/useSkiTracking'
import { LegacyCell as Cell, LegacyGrid } from './kit/LiveFrame'
import { useI18n } from '@/lib/i18n'
import { distFactor, altFactor, getUnitLabel, SIZE_SCALE, type LiveUnits, type DataSize } from './units'

interface Props {
  isDark: boolean
  maxSpeedKmh: number
  avgSpeedRunKmh: number
  runCount: number
  totalRunDistanceM: number
  elevationLossM: number
  phase: SkiPhase
  dataFontFamily?: string
  units?: LiveUnits
  dataSize?: DataSize
}


const PHASE_KEYS: Record<SkiPhase, string> = { run: 'record.skiPhaseRun', lift: 'record.skiPhaseLift', pause: 'record.skiPhasePause' }

export default function SkiPage3({ isDark, maxSpeedKmh, avgSpeedRunKmh, runCount, totalRunDistanceM, elevationLossM, phase, dataFontFamily, units, dataSize }: Props) {
  const { t } = useI18n()
  const font = dataFontFamily ?? '-apple-system, sans-serif'
  // Réglages Unités / Taille des données appliqués à l'affichage.
  const distF = distFactor(units)
  const altF  = altFactor(units)
  const kmhUnit = getUnitLabel('km/h', units)
  const sizes = SIZE_SCALE[dataSize ?? 'normal']
  return (
    <LegacyGrid>
      <Cell big isDark={isDark} font={font} sizes={sizes} label={t('record.skiMaxSpeed')} value={(maxSpeedKmh * distF).toFixed(1)} unit={kmhUnit} />
      <Cell isDark={isDark} font={font} sizes={sizes} label={t('record.skiRuns')} value={String(runCount)} />
      <Cell isDark={isDark} font={font} sizes={sizes} label={t('record.skiRunDistance')} value={((totalRunDistanceM / 1000) * distF).toFixed(2)} unit={getUnitLabel('km', units)} />
      <Cell isDark={isDark} font={font} sizes={sizes} label={t('record.skiElevLoss')} value={String(Math.round(elevationLossM * altF))} unit={getUnitLabel('m', units)} />
      <Cell isDark={isDark} font={font} sizes={sizes} label={t('record.skiAvgRunSpeed')} value={(avgSpeedRunKmh * distF).toFixed(1)} unit={kmhUnit} />
      <Cell isDark={isDark} font={font} sizes={sizes} label={t('record.skiPhase')} value={t(PHASE_KEYS[phase])} />
    </LegacyGrid>
  )
}
