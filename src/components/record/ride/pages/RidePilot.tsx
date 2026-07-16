'use client'
// Page 1 — Pilotage. Puissance en géant + écart à la cible (info n°2), bloc en
// cours, cadence / FC, mini-courbe.
import { Card, Lbl, NUM } from '../ui/atoms'
import GaugeBar from '../ui/GaugeBar'
import MiniChart from '../charts/MiniChart'
import { fmtMs } from '../format'
import type { RideView, Derived } from '../viewModel'

export default function RidePilot({ v, d }: { v: RideView; d: Derived }) {
  return (
    <>
      <div style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--text-dim)', fontWeight: 800, padding: '2px 2px 8px' }}>Pilotage</div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', padding: '9px 13px' }}>
        <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--text)' }}>{v.current?.name ?? 'Sortie libre'}</span>
        <span style={{ fontSize: 11, color: 'var(--primary)', fontWeight: 800, letterSpacing: '0.06em' }}>{d.repLabel}</span>
      </div>

      {v.plan && (
        <div style={{ textAlign: 'center', padding: '10px 0 2px' }}>
          <div style={{ ...NUM, fontSize: 44, color: 'var(--text)' }}>{fmtMs(d.countdownS)}</div>
          <div style={{ marginTop: 5 }}><Lbl>Restant sur l&apos;intervalle</Lbl></div>
        </div>
      )}

      <div style={{ textAlign: 'center', padding: '6px 0 0' }}>
        <div><span style={{ ...NUM, fontSize: 104, lineHeight: 0.8, color: 'var(--text)' }}>{d.power}</span><span style={{ fontSize: 22, color: 'var(--text-mid)', fontWeight: 800, marginLeft: 4 }}>W</span></div>
        {v.current && (
          <div style={{ fontSize: 13, color: 'var(--text-mid)', fontWeight: 800, marginTop: 8 }}>
            cible <b style={{ color: 'var(--primary)' }}>{d.targetW} W</b> · {d.pct} % FTP
          </div>
        )}
      </div>

      {v.current && <div style={{ margin: '14px 2px 0' }}><GaugeBar deltaW={d.deltaW} /></div>}

      <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
        <Card style={{ flex: 1, borderRadius: 'var(--r-lg)' }}>
          <Lbl>Cadence</Lbl>
          <div style={{ ...NUM, fontSize: 34, marginTop: 3, color: 'var(--text)' }}>{d.cadence ?? '—'}<small style={{ fontSize: 12, color: 'var(--text-mid)', fontWeight: 700, marginLeft: 3 }}>rpm</small></div>
        </Card>
        <Card style={{ flex: 1, borderRadius: 'var(--r-lg)' }}>
          <Lbl>Fréq. cardiaque</Lbl>
          <div style={{ ...NUM, fontSize: 34, marginTop: 3, color: 'var(--ride-hr)' }}>{d.hr ?? '—'}<small style={{ fontSize: 12, color: 'var(--text-mid)', fontWeight: 700, marginLeft: 3 }}>bpm</small></div>
        </Card>
      </div>

      <div style={{ marginTop: 14, height: 54, borderRadius: 'var(--r-sm)', background: 'var(--bg-card)', border: '1px solid var(--border)', overflow: 'hidden' }}>
        <MiniChart samples={v.samples} ftp={v.ftp} t={v.t} />
      </div>
    </>
  )
}
