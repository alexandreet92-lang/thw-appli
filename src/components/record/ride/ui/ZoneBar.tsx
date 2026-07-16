'use client'
// Barre de zones Z1→Z7. La zone active est allumée à sa couleur (token
// --zone-N) ; les autres restent en surface neutre.
import { ZONES } from '../zones'

export default function ZoneBar({ active }: { active: number }) {
  return (
    <div style={{ display: 'flex', gap: 3 }}>
      {ZONES.map((z, i) => {
        const on = i === active
        return (
          <div key={z.key} style={{
            flex: 1, height: 34, borderRadius: 7, display: 'grid', placeItems: 'center',
            fontSize: 10, fontWeight: 800, transition: 'background .2s',
            background: on ? z.token : 'var(--bg-card2)',
            color: on ? 'var(--ride-zone-ink)' : 'var(--text-dim)',
          }}>{z.key}</div>
        )
      })}
    </div>
  )
}
