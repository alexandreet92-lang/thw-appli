'use client'
// Page 4 — Données. Moyennes / NP / IF / kJ / FC / cadence / temps restant, puis
// l'état détaillé des capteurs.
import { Metric } from '../ui/atoms'
import { fmtClock } from '../format'
import type { RideView, Derived } from '../viewModel'
import type { SensorStatus } from '../useSensors'

const STAT_LABEL: Record<SensorStatus, string> = {
  idle: 'Absent', connecting: 'Connexion…', connected: 'Connecté', error: 'Erreur',
}

function SensorRow({ name, st }: { name: string; st: SensorStatus }) {
  const on = st === 'connected'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
      <span style={{ width: 7, height: 7, borderRadius: '50%', background: on ? 'var(--charge-low)' : 'var(--text-dim)' }} />
      <span style={{ flex: 1, fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{name}</span>
      <span style={{ fontSize: 11, fontWeight: 800, color: on ? 'var(--charge-low)' : 'var(--text-dim)' }}>{STAT_LABEL[st]}</span>
    </div>
  )
}

export default function RideData({ v, d, status }: { v: RideView; d: Derived; status: Record<'trainer' | 'hr' | 'cadence', SensorStatus> }) {
  return (
    <>
      <div style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--text-dim)', fontWeight: 800, padding: '2px 2px 8px' }}>Données</div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9 }}>
        <Metric label="Puiss. moy" value={v.metrics.avgW} unit="W" />
        <Metric label="NP" value={v.metrics.np} unit="W" />
        <Metric label="IF" value={v.metrics.if.toFixed(2)} />
        <Metric label="Travail" value={v.metrics.kj} unit="kJ" />
        <Metric label="FC moy" value={v.metrics.hrAvg || '—'} unit="bpm" />
        <Metric label="FC max" value={v.metrics.hrMax || '—'} unit="bpm" />
        <Metric label="Cadence moy" value={v.metrics.cadAvg || '—'} unit="rpm" />
        <Metric label="Temps restant" value={v.plan ? fmtClock(d.remainingS) : '—'} />
      </div>

      <div style={{ marginTop: 12, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', padding: '4px 12px' }}>
        <SensorRow name="Home trainer" st={status.trainer} />
        <SensorRow name="Ceinture cardio" st={status.hr} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0' }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: status.cadence === 'connected' ? 'var(--charge-low)' : 'var(--text-dim)' }} />
          <span style={{ flex: 1, fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>Cadence</span>
          <span style={{ fontSize: 11, fontWeight: 800, color: status.cadence === 'connected' ? 'var(--charge-low)' : 'var(--text-dim)' }}>{status.cadence === 'connected' ? 'Connecté' : 'Via trainer'}</span>
        </div>
      </div>
    </>
  )
}
