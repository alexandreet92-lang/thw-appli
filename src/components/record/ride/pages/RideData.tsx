'use client'
// Page 4 — Données. Moyennes / NP / IF / kJ / FC / cadence / temps restant, puis
// l'état détaillé des capteurs.
import { Metric } from '../ui/atoms'
import { useI18n } from '@/lib/i18n'
import { fmtClock } from '../format'
import type { RideView, Derived } from '../viewModel'
import type { SensorStatus } from '../useSensors'

const STAT_LABEL: Record<SensorStatus, string> = {
  idle: 'w3b.sensor_idle', connecting: 'w3b.sensor_connecting', connected: 'w3b.sensor_connected', error: 'w3b.sensor_error',
}

function SensorRow({ name, st }: { name: string; st: SensorStatus }) {
  const { t } = useI18n()
  const on = st === 'connected'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
      <span style={{ width: 7, height: 7, borderRadius: '50%', background: on ? 'var(--charge-low)' : 'var(--text-dim)' }} />
      <span style={{ flex: 1, fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{name}</span>
      <span style={{ fontSize: 11, fontWeight: 800, color: on ? 'var(--charge-low)' : 'var(--text-dim)' }}>{t(STAT_LABEL[st])}</span>
    </div>
  )
}

export default function RideData({ v, d, status }: { v: RideView; d: Derived; status: Record<'trainer' | 'hr' | 'cadence', SensorStatus> }) {
  const { t } = useI18n()
  return (
    <>
      <div style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--text-dim)', fontWeight: 800, padding: '2px 2px 8px' }}>{t('w3b.data')}</div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9 }}>
        <Metric label={t('w3b.avg_power')} value={v.metrics.avgW} unit="W" />
        <Metric label="NP" value={v.metrics.np} unit="W" />
        <Metric label="IF" value={v.metrics.if.toFixed(2)} />
        <Metric label={t('w3b.work')} value={v.metrics.kj} unit="kJ" />
        <Metric label={t('w3b.avg_hr')} value={v.metrics.hrAvg || '—'} unit="bpm" />
        <Metric label={t('w3b.max_hr')} value={v.metrics.hrMax || '—'} unit="bpm" />
        <Metric label={t('w3b.avg_cadence')} value={v.metrics.cadAvg || '—'} unit="rpm" />
        <Metric label={t('w3b.time_remaining')} value={v.plan ? fmtClock(d.remainingS) : '—'} />
      </div>

      <div style={{ marginTop: 12, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', padding: '4px 12px' }}>
        <SensorRow name={t('w3b.home_trainer')} st={status.trainer} />
        <SensorRow name={t('w3b.hr_belt')} st={status.hr} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0' }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: status.cadence === 'connected' ? 'var(--charge-low)' : 'var(--text-dim)' }} />
          <span style={{ flex: 1, fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{t('w3b.cadence')}</span>
          <span style={{ fontSize: 11, fontWeight: 800, color: status.cadence === 'connected' ? 'var(--charge-low)' : 'var(--text-dim)' }}>{status.cadence === 'connected' ? t('w3b.sensor_connected') : t('w3b.via_trainer')}</span>
        </div>
      </div>
    </>
  )
}
