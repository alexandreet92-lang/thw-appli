'use client'
// Page 1 — Pilotage. Puissance en géant + écart à la cible (info n°2), bloc en
// cours, cadence / FC, mini-courbe.
import { Card, Lbl, NUM } from '../ui/atoms'
import GaugeBar from '../ui/GaugeBar'
import MiniChart from '../charts/MiniChart'
import { useI18n } from '@/lib/i18n'
import { fmtMs } from '../format'
import type { RideView, Derived } from '../viewModel'

export default function RidePilot({ v, d, onStopTest }: { v: RideView; d: Derived; onStopTest?: () => void }) {
  const { t } = useI18n()
  return (
    <>
      <div style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--text-dim)', fontWeight: 800, padding: '2px 2px 8px' }}>{t('w3b.piloting')}</div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', padding: '9px 13px' }}>
        <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--text)' }}>{v.current?.name ?? t('w3b.free_ride')}</span>
        <span style={{ fontSize: 11, color: 'var(--primary)', fontWeight: 800, letterSpacing: '0.06em' }}>{d.repLabel}</span>
      </div>

      {v.plan && !d.isCp20Block && (
        <div style={{ textAlign: 'center', padding: '10px 0 2px' }}>
          <div style={{ ...NUM, fontSize: 44, color: 'var(--text)' }}>{fmtMs(d.countdownS)}</div>
          <div style={{ marginTop: 5 }}><Lbl>{d.isRampBlock ? t('w3b.remaining_step') : t('w3b.remaining_interval')}</Lbl></div>
        </div>
      )}

      <div style={{ textAlign: 'center', padding: '6px 0 0' }}>
        <div><span style={{ ...NUM, fontSize: 104, lineHeight: 0.8, color: 'var(--text)' }}>{d.power}</span><span style={{ fontSize: 22, color: 'var(--text-mid)', fontWeight: 800, marginLeft: 4 }}>W</span></div>
        <div style={{ fontSize: 13, color: 'var(--text-mid)', fontWeight: 800, marginTop: 8, display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
          {d.isCp20Block
            ? <span>{t('w3b.cp20_full')}</span>
            : v.current && d.targetW > 0 && <span>{t('w3b.target')} <b style={{ color: 'var(--primary)' }}>{d.targetW} W</b> · {d.pct} % FTP</span>}
          {d.wkg != null && <span>· <b style={{ color: 'var(--text)' }}>{d.wkg.toFixed(1).replace('.', ',')}</b> W/kg</span>}
        </div>
      </div>

      {v.current && d.targetW > 0 && <div style={{ margin: '14px 2px 0' }}><GaugeBar deltaW={d.deltaW} /></div>}

      {/* Bouton « Stop test » — rampe uniquement : arrête le test à l'épuisement
          et bascule directement sur la récupération. */}
      {d.isRampBlock && onStopTest && (
        <button onClick={onStopTest} style={{ marginTop: 14, padding: '13px 16px', borderRadius: 'var(--r-md)', background: 'var(--danger, #ef4444)', border: 'none', color: '#fff', fontSize: 14, fontWeight: 800, cursor: 'pointer', width: '100%' }}>
          {t('w3b.stop_test')}
        </button>
      )}

      <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
        <Card style={{ flex: 1, borderRadius: 'var(--r-lg)' }}>
          <Lbl>{t('w3b.cadence')}{d.cadenceTarget != null ? ` · ${t('w3b.cadence_target', { n: d.cadenceTarget })}` : ''}</Lbl>
          <div style={{ ...NUM, fontSize: 34, marginTop: 3, color: 'var(--text)' }}>{d.cadence ?? '—'}<small style={{ fontSize: 12, color: 'var(--text-mid)', fontWeight: 700, marginLeft: 3 }}>rpm</small></div>
        </Card>
        <Card style={{ flex: 1, borderRadius: 'var(--r-lg)' }}>
          <Lbl>{t('w3b.heart_rate')}</Lbl>
          <div style={{ ...NUM, fontSize: 34, marginTop: 3, color: 'var(--ride-hr)' }}>{d.hr ?? '—'}<small style={{ fontSize: 12, color: 'var(--text-mid)', fontWeight: 700, marginLeft: 3 }}>bpm</small></div>
        </Card>
      </div>

      <div style={{ marginTop: 14, height: 54, borderRadius: 'var(--r-sm)', background: 'var(--bg-card)', border: '1px solid var(--border)', overflow: 'hidden' }}>
        <MiniChart samples={v.samples} ftp={v.ftp} t={v.t} />
      </div>
    </>
  )
}
