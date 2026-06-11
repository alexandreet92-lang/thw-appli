'use client'
// Records Aviron = DistanceRecords avec barème aviron (allure /500m, type Concept2).
import { DistanceRecords, type DistDef, type Bench } from './DistanceRecords'

const ROW = '#14b8a6' // design-allow-color — teinte sport aviron sanctionnée

const DISTS: DistDef[] = [
  { id: '500m', m: 500 }, { id: '1000m', m: 1000 }, { id: '2000m', m: 2000 },
  { id: '5000m', m: 5000 }, { id: '10000m', m: 10000 },
  { id: 'Semi', m: 21097, label: 'Semi (21km)' }, { id: 'Marathon', m: 42195, label: 'Marathon (42km)' },
]
// Allure de référence en s/500m par distance [elite, base].
const BENCH_H: Bench = {
  '500m': [83, 135], '1000m': [88, 145], '2000m': [92, 155], '5000m': [98, 165],
  '10000m': [102, 172], 'Semi': [108, 185], 'Marathon': [115, 195],
}

export interface RowingRecordsProps {
  getBest: (dist: string) => { id: string; perf: string } | null
  getPrev: (dist: string) => { perf: string } | null
  onSelect: (label: string, value: string) => void
  onEdit: (dist: string, id: string | null, perf: string) => void
  selectedPerf?: string
}

export function RowingRecords(props: RowingRecordsProps) {
  return (
    <DistanceRecords
      sportLabel="Aviron" color={ROW} dists={DISTS}
      benchH={BENCH_H} paceBaseM={500} paceSuffix="/500m"
      {...props}
    />
  )
}
