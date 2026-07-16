'use client'
// Jauge d'écart à la cible watts. Curseur centré = pile sur la cible ; vert
// dans ±12 W, ambre jusqu'à ±25 W, rouge au-delà (deviationToken). Plage ±40 W.
import { deviationToken } from '../zones'
import { NUM } from './atoms'

export default function GaugeBar({ deltaW }: { deltaW: number }) {
  const pos = Math.max(2, Math.min(98, 50 + (deltaW / 40) * 50))
  const col = deviationToken(deltaW)
  const txt = `${deltaW >= 0 ? '+' : ''}${Math.round(deltaW)} W`
  return (
    <div>
      <div style={{ position: 'relative', height: 38, borderRadius: 'var(--r-sm)', background: 'var(--bg-card2)', border: '1px solid var(--border)', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: 0, bottom: 0, left: '38%', width: '24%', background: 'var(--charge-low)', opacity: 0.16 }} />
        <div style={{ position: 'absolute', top: 0, bottom: 0, left: '50%', width: 1, background: 'var(--border-mid)' }} />
        <div style={{ position: 'absolute', top: 3, bottom: 3, width: 5, borderRadius: 3, left: `${pos}%`, transform: 'translateX(-50%)', background: col, transition: 'left .25s, background .25s' }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
        <span style={{ fontSize: 10, color: 'var(--text-dim)', fontWeight: 800 }}>−40 W</span>
        <span style={{ ...NUM, fontSize: 13, color: col }}>{txt}</span>
        <span style={{ fontSize: 10, color: 'var(--text-dim)', fontWeight: 800 }}>+40 W</span>
      </div>
    </div>
  )
}
