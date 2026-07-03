'use client'
// Records Natation = DistanceRecords avec barème natation (allure /100m, genré H/F).
import { DistanceRecords, type DistDef, type Bench } from './DistanceRecords'
import { useI18n } from '@/lib/i18n'

const SWIM = '#0ea5b7' // design-allow-color — teinte sport natation sanctionnée

const DISTS: DistDef[] = [
  { id: '100m', m: 100 }, { id: '200m', m: 200 }, { id: '400m', m: 400 },
  { id: '1000m', m: 1000 }, { id: '1500m', m: 1500 }, { id: '2000m', m: 2000 },
  { id: '5000m', m: 5000 }, { id: '10000m', m: 10000 },
]
// Allure de référence en s/100m par distance [elite, base].
const BENCH_H: Bench = {
  '100m': [50, 110], '200m': [53, 118], '400m': [56, 128], '1000m': [60, 140],
  '1500m': [62, 148], '2000m': [64, 155], '5000m': [67, 165], '10000m': [70, 178],
}
const BENCH_F: Bench = {
  '100m': [56, 120], '200m': [59, 128], '400m': [62, 138], '1000m': [66, 150],
  '1500m': [68, 158], '2000m': [70, 165], '5000m': [73, 175], '10000m': [76, 188],
}

export interface SwimRecordsProps {
  getBest: (dist: string) => { id: string; perf: string } | null
  getPrev: (dist: string) => { perf: string } | null
  onSelect: (label: string, value: string) => void
  onEdit: (dist: string, id: string | null, perf: string) => void
  selectedPerf?: string
}

export function SwimRecords(props: SwimRecordsProps) {
  const { t } = useI18n()
  return (
    <DistanceRecords
      sportLabel={t('performance.sportSwimming')} color={SWIM} dists={DISTS}
      benchH={BENCH_H} benchF={BENCH_F} paceBaseM={100} paceSuffix="/100m" showGender
      {...props}
    />
  )
}
