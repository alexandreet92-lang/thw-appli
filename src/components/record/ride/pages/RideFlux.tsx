'use client'
// Page 2 — Flux. Courbe live puissance + cardio (5 min), légende, barre de
// zones, temps passé dans la zone courante.
import { useI18n } from '@/lib/i18n'
import LiveChart from '../charts/LiveChart'
import ZoneBar from '../ui/ZoneBar'
import { Lbl } from '../ui/atoms'
import { fmtMs } from '../format'
import type { RideView, Derived } from '../viewModel'

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 800, color: 'var(--text-mid)' }}>
      <span style={{ width: 14, height: 3, borderRadius: 2, background: color }} />{label}
    </div>
  )
}

export default function RideFlux({ v, d }: { v: RideView; d: Derived }) {
  const { t } = useI18n()
  return (
    <>
      <div style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--text-dim)', fontWeight: 800, padding: '2px 2px 8px' }}>{t('w4a.flux_last5')}</div>

      <div style={{ flex: 1, minHeight: 0, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', padding: 10, display: 'flex', flexDirection: 'column' }}>
        <div style={{ flex: 1, minHeight: 0 }}>
          <LiveChart samples={v.samples} ftp={v.ftp} fcMax={v.fcMax} windowS={300} t={v.t} />
        </div>
        <div style={{ display: 'flex', gap: 14, padding: '6px 4px 2px' }}>
          <LegendItem color="var(--ride-power)" label={t('w4a.power')} />
          <LegendItem color="var(--ride-hr)" label={t('w4a.cardio')} />
          <span style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 800, color: 'var(--text-dim)' }}>{t('w4a.smoothed_3s')}</span>
        </div>
      </div>

      <div style={{ marginTop: 12 }}><ZoneBar active={d.zone} /></div>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
        <div><Lbl>{t('w4a.current_zone')}</Lbl><div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text)' }}>{d.zoneKey} · {d.zoneName}</div></div>
        <div style={{ textAlign: 'right' }}><Lbl>{t('w4a.time_in_zone')}</Lbl><div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text)' }}>{fmtMs(v.metrics.zoneTimeS)}</div></div>
      </div>
    </>
  )
}
