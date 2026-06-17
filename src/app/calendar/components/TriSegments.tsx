'use client'
// Triathlon : 5 segments (Natation · T1 · Vélo · T2 · Course) avec calculs
// live. Réutilise EXACTEMENT les clés performanceData existantes (triSwimTime,
// t1, triBikeTime, triBikeDist, bikeWatts, t2, triRunTime, triRunDist).
import { SPORT_COLOR } from './types'
import { paceKm, pace100, speedKmh, numOr0 } from '@/lib/race/computePace'
import { SegmentCard, TransitionCard, SegInput, CalcField, ROW2 } from './RaceSegmentCard'

export default function TriSegments({ pd, setPd }: { pd: Record<string, unknown>; setPd: (v: Record<string, unknown>) => void }) {
  const g = (k: string) => (pd[k] as string) ?? ''
  const s = (k: string, v: string) => setPd({ ...pd, [k]: v })
  const bikeKm = numOr0(pd.triBikeDist)
  const runKm = numOr0(pd.triRunDist)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <SegmentCard color={SPORT_COLOR.swim} label="Natation">
        <div style={ROW2}>
          <SegInput label="Temps" value={g('triSwimTime')} onChange={v => s('triSwimTime', v)} placeholder="00:30:00" />
          <CalcField label="Allure /100m" value={pace100(g('triSwimTime'), 1000)} />
        </div>
      </SegmentCard>

      <TransitionCard label="T1 · Transition" from="Natation" to="Vélo" value={g('t1')} onChange={v => s('t1', v)} />

      <SegmentCard color={SPORT_COLOR.bike} label="Vélo" volume={bikeKm ? `${bikeKm} km` : undefined}>
        <div style={ROW2}>
          <SegInput label="Temps" value={g('triBikeTime')} onChange={v => s('triBikeTime', v)} placeholder="02:30:00" />
          <SegInput label="Distance (km)" value={g('triBikeDist')} onChange={v => s('triBikeDist', v)} placeholder="90" type="number" />
          <SegInput label="Watts cible" value={g('bikeWatts')} onChange={v => s('bikeWatts', v)} placeholder="180" type="number" />
          <CalcField label="Vitesse" value={speedKmh(g('triBikeTime'), bikeKm)} />
        </div>
      </SegmentCard>

      <TransitionCard label="T2 · Transition" from="Vélo" to="Course" value={g('t2')} onChange={v => s('t2', v)} />

      <SegmentCard color={SPORT_COLOR.run} label="Course" volume={runKm ? `${runKm} km` : undefined}>
        <div style={ROW2}>
          <SegInput label="Temps" value={g('triRunTime')} onChange={v => s('triRunTime', v)} placeholder="01:30:00" />
          <SegInput label="Distance (km)" value={g('triRunDist')} onChange={v => s('triRunDist', v)} placeholder="21.1" type="number" />
          <CalcField label="Allure /km" value={paceKm(g('triRunTime'), runKm)} />
        </div>
      </SegmentCard>
    </div>
  )
}
