'use client'
// Barres de zones animées (remplissage 0 → valeur au montage / changement).
// `key` force le remontage de AnimatedBar à chaque changement de type/sport.
import { AnimatedBar } from '@/components/ui/AnimatedBar'
import type { Zone } from './zones'

const FB = 'var(--font-body)'

export function ZoneBars({ zones, animKey }: { zones: Zone[]; animKey: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
      {zones.map(z => (
        <div key={z.z} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <span className="tnum" style={{ fontFamily: FB, fontSize: 10, fontWeight: 600, color: 'var(--text-mid)', width: 20, flexShrink: 0 }}>{z.z}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <AnimatedBar key={`${animKey}-${z.z}`} pct={z.pct} color={z.color} height={6} />
          </div>
          <span className="tnum" style={{ fontFamily: FB, fontSize: 10, color: 'var(--text-mid)', width: 92, textAlign: 'right', flexShrink: 0 }}>{z.range}</span>
          <span style={{ fontFamily: FB, fontSize: 10, color: 'var(--text-dim)', width: 64, flexShrink: 0 }}>{z.label}</span>
        </div>
      ))}
    </div>
  )
}
