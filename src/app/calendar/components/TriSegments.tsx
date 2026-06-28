'use client'
// Triathlon : sélecteur de format (S / M / 70.3 / Ironman, auto-remplit les
// distances) + 5 segments (Natation · T1 · Vélo · T2 · Course) avec calculs
// live. Réutilise les clés performanceData existantes.
import type { ReactNode } from 'react'
import { SPORT_COLOR } from './types'
import { paceKm, pace100, speedKmh, numOr0 } from '@/lib/race/computePace'
import { SegmentCard, TransitionCard, SegInput, CalcField, ROW2 } from './RaceSegmentCard'

const TRI_FORMATS: { label: string; swim: number; bike: number; run: number }[] = [
  { label: 'S', swim: 750, bike: 20, run: 5 },
  { label: 'M', swim: 1500, bike: 40, run: 10 },
  { label: '70.3', swim: 1900, bike: 90, run: 21.1 },
  { label: 'Ironman', swim: 3800, bike: 180, run: 42.2 },
]
const TRI = SPORT_COLOR.triathlon

export default function TriSegments({ pd, setPd, bikeParcours, runParcours }: {
  pd: Record<string, unknown>; setPd: (v: Record<string, unknown>) => void
  bikeParcours?: ReactNode; runParcours?: ReactNode
}) {
  const g = (k: string) => (pd[k] as string) ?? ''
  const s = (k: string, v: string) => setPd({ ...pd, [k]: v })
  const bikeKm = numOr0(pd.triBikeDist)
  const runKm = numOr0(pd.triRunDist)
  const swimM = numOr0(pd.triSwimDist) || 1000
  function pickFormat(f: typeof TRI_FORMATS[number]) {
    setPd({ ...pd, triFormat: f.label, triSwimDist: String(f.swim), triBikeDist: String(f.bike), triRunDist: String(f.run) })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Format / distance */}
      <div>
        <p style={{ fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-dim)', margin: '0 0 6px' }}>Distance</p>
        <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
          {TRI_FORMATS.map(f => { const on = pd.triFormat === f.label; return (
            <button key={f.label} onClick={() => pickFormat(f)} style={{ padding: '8px 16px', borderRadius: 999, border: `1px solid ${on ? TRI : 'var(--border)'}`, background: on ? 'var(--bg-card)' : 'transparent', color: on ? TRI : 'var(--text-dim)', fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }}>{f.label}</button>
          ) })}
        </div>
      </div>

      <SegmentCard color={SPORT_COLOR.swim} label="Natation" volume={numOr0(pd.triSwimDist) ? `${numOr0(pd.triSwimDist)} m` : undefined}>
        <div style={ROW2}>
          <SegInput label="Temps" value={g('triSwimTime')} onChange={v => s('triSwimTime', v)} placeholder="00:30:00" />
          <CalcField label="Allure /100m" value={pace100(g('triSwimTime'), swimM)} />
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
        {bikeParcours}
      </SegmentCard>

      <TransitionCard label="T2 · Transition" from="Vélo" to="Course" value={g('t2')} onChange={v => s('t2', v)} />

      <SegmentCard color={SPORT_COLOR.run} label="Course" volume={runKm ? `${runKm} km` : undefined}>
        <div style={ROW2}>
          <SegInput label="Temps" value={g('triRunTime')} onChange={v => s('triRunTime', v)} placeholder="01:30:00" />
          <SegInput label="Distance (km)" value={g('triRunDist')} onChange={v => s('triRunDist', v)} placeholder="21.1" type="number" />
          <CalcField label="Allure /km" value={paceKm(g('triRunTime'), runKm)} />
        </div>
        {runParcours}
      </SegmentCard>
    </div>
  )
}
