'use client'
// Aperçu live d'une séance TAPIS pendant la saisie : distance + dénivelé
// auto-calculés (depuis vitesses × temps × pentes), VAP (vitesse ajustée à
// plat, éq. ACSM) et PROFIL ALTIMÉTRIQUE (SVG brut, montée monotone). S'inspire
// du planning mais ajoute ces éléments propres au tapis.
import { useMemo } from 'react'
import type { MBlock } from '@/components/planning/mobile/blocks'
import { buildTreadmillPlan } from './treadmillPlan'
import { buildTreadmillStreams, summarizeIntervals, kmhEq, type TreadInterval } from './treadmillProfile'

export function TreadmillProfilePreview({ blocks }: { blocks: MBlock[] }) {
  const data = useMemo(() => {
    const plan = buildTreadmillPlan(blocks as never, 'tmp')
    if (!plan || plan.steps.length === 0) return null
    const intervals: TreadInterval[] = plan.steps.map(st => ({
      durationS: st.durationS,
      speedKmh: st.targetKmh ?? (st.targetPaceSecPerKm ? 3600 / st.targetPaceSecPerKm : 0),
      inclinePct: st.inclinePct,
    }))
    const sum = summarizeIntervals(intervals)
    const streams = buildTreadmillStreams(intervals)
    // VAP = moyenne de la vitesse équivalente plat, pondérée par le temps.
    let vapNum = 0, vapDen = 0
    for (const iv of intervals) { vapNum += kmhEq(iv.speedKmh, iv.inclinePct) * iv.durationS; vapDen += iv.durationS }
    const vap = vapDen > 0 ? vapNum / vapDen : 0
    return { sum, streams, vap }
  }, [blocks])

  if (!data || !data.streams) return null
  const { sum, streams, vap } = data
  const alt = streams.altitude
  const W = 320, H = 78
  const mx = Math.max(...alt), rg = mx || 1
  const pts = alt.map((v, i) => {
    const x = (i / Math.max(1, alt.length - 1)) * W
    const y = H - (v / rg) * (H - 6) - 3
    return `${x.toFixed(1)},${y.toFixed(1)}`
  })
  const area = `M0,${H}L${pts.join('L')}L${W},${H}Z`
  const line = `M${pts.join('L')}`

  const stat = (label: string, value: string) => (
    <div style={{ flex: 1, textAlign: 'center' }}>
      <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)', fontVariantNumeric: 'tabular-nums' }}>{value}</div>
      <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-mid)', marginTop: 2 }}>{label}</div>
    </div>
  )

  return (
    <div style={{ background: 'var(--bg-card2)', borderRadius: 14, padding: 14, marginTop: 4 }}>
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-dim)', marginBottom: 10 }}>
        Profil altimétrique · estimé
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ width: '100%', height: 78, display: 'block' }}>
        <path d={area} fill="var(--zone-3)" fillOpacity={0.18} />
        <path d={line} fill="none" stroke="var(--zone-3)" strokeWidth={2} strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      </svg>
      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        {stat('Distance', `${(sum.distanceM / 1000).toFixed(2).replace('.', ',')} km`)}
        {stat('Dénivelé +', `${sum.elevationM} m`)}
        {stat('VAP', `${vap.toFixed(1).replace('.', ',')} km/h`)}
      </div>
      <div style={{ fontSize: 11, color: 'var(--text-mid)', marginTop: 8, textAlign: 'center' }}>
        VAP = vitesse équivalente à plat (pente 0 %). Le tapis ne descend jamais : le profil ne fait que monter ou rester plat.
      </div>
    </div>
  )
}
