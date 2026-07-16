'use client'
// Pastilles d'état des capteurs (trainer / cardio / cadence). Vert = connecté,
// gris = absent. Purement indicatif dans la barre haute.
import type { SensorStatus } from '../useSensors'

const DOT = (on: boolean) => ({
  width: 7, height: 7, borderRadius: '50%',
  background: on ? 'var(--charge-low)' : 'var(--text-dim)',
})

export default function SensorDots({ status }: { status: Record<'trainer' | 'hr' | 'cadence', SensorStatus> }) {
  return (
    <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
      <span style={DOT(status.trainer === 'connected')} />
      <span style={DOT(status.hr === 'connected')} />
      <span style={DOT(status.cadence === 'connected')} />
    </div>
  )
}
