'use client'
import { formatSeconds } from '@/hooks/useStopwatch'

export interface Lap {
  number: number
  duration: number     // secondes
  distance: number     // mètres
  avgSpeed: number     // km/h
  timestamp: number
}

interface Props {
  laps: Lap[]
  isDark?: boolean
}

export default function LapsList({ laps, isDark = false }: Props) {
  const text       = isDark ? '#FFFFFF' : '#0A0A0A'
  const labelColor = isDark ? 'rgba(255,255,255,0.40)' : '#8C8C8C'
  const separator  = isDark ? 'rgba(255,255,255,0.08)' : '#EFEFEF'

  if (laps.length === 0) {
    return (
      <p style={{ textAlign: 'center', fontSize: 12, color: labelColor, marginTop: 24 }}>
        Aucun lap enregistré
      </p>
    )
  }
  return (
    <div style={{ marginTop: 4 }}>
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8,
        padding: '8px 12px',
        fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.15em',
        color: labelColor, fontWeight: 700,
      }}>
        <span>Lap</span><span>Temps</span><span>Distance</span><span>Vit. moy.</span>
      </div>
      {[...laps].reverse().map(lap => (
        <div
          key={lap.number}
          style={{
            display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8,
            padding: '10px 12px',
            fontSize: 13, color: text, fontFamily: 'DM Mono, monospace',
            borderTop: `1px solid ${separator}`,
          }}
        >
          <span>#{lap.number}</span>
          <span>{formatSeconds(lap.duration)}</span>
          <span>{(lap.distance / 1000).toFixed(2)} km</span>
          <span>{lap.avgSpeed.toFixed(1)} km/h</span>
        </div>
      ))}
    </div>
  )
}
