'use client'
// Écran ordinateur : tableau de bord dense, tout visible d'un coup. 3 colonnes
// + frise d'intervalles en bas, recentrée sur le bloc en cours.
import { useEffect, useRef } from 'react'
import LiveChart from './charts/LiveChart'
import ProfileChart from './charts/ProfileChart'
import GaugeBar from './ui/GaugeBar'
import ZoneBar from './ui/ZoneBar'
import { Metric, Lbl } from './ui/atoms'
import { zoneIndex, ZONES } from './zones'
import { fmtMs, fmtClock } from './format'
import type { RideView, Derived } from './viewModel'
import type { SensorStatus } from './useSensors'

const panel: React.CSSProperties = { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', padding: 14 }

function Chip({ name, on }: { name: string; on: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 7, background: 'var(--bg-card2)', border: '1px solid var(--border)', borderRadius: 20, padding: '6px 12px', fontSize: 12, fontWeight: 700, color: 'var(--text-mid)' }}>
      <span style={{ width: 7, height: 7, borderRadius: '50%', background: on ? 'var(--charge-low)' : 'var(--text-dim)' }} />{name}
    </div>
  )
}

export default function RideDesktop({ v, d, status, onTogglePause, onFinish }: {
  v: RideView; d: Derived; status: Record<'trainer' | 'hr' | 'cadence', SensorStatus>; onTogglePause: () => void; onFinish: () => void
}) {
  const curIdx = v.current ? v.plan?.blocks.indexOf(v.current) ?? -1 : -1
  const stripRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = stripRef.current?.children[curIdx] as HTMLElement | undefined
    el?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
  }, [curIdx])

  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', background: 'var(--bg)', overflow: 'auto' }}>
      {/* En-tête */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '14px 20px', borderBottom: '1px solid var(--border)', background: 'var(--bg-card)' }}>
        <span style={{ fontSize: 17, fontWeight: 800, color: 'var(--text)' }}>{v.plan?.title ?? 'Sortie libre'}</span>
        <span style={{ fontSize: 22, fontWeight: 800, color: 'var(--primary)', fontVariantNumeric: 'tabular-nums' }}>{fmtClock(v.t)}</span>
        <span style={{ flex: 1 }} />
        <Chip name="Home trainer" on={status.trainer === 'connected'} />
        <Chip name="Cardio" on={status.hr === 'connected'} />
        <button onClick={onTogglePause} style={{ padding: '9px 16px', borderRadius: 'var(--r-sm)', background: 'var(--bg-card2)', border: '1px solid var(--border-mid)', color: 'var(--text)', fontSize: 13, fontWeight: 800, cursor: 'pointer' }}>Pause</button>
        <button onClick={onFinish} style={{ padding: '9px 16px', borderRadius: 'var(--r-sm)', background: 'var(--bg-card2)', border: '1px solid var(--border-mid)', color: 'var(--charge-hard)', fontSize: 13, fontWeight: 800, cursor: 'pointer' }}>Terminer</button>
      </div>

      {/* Corps 3 colonnes */}
      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr 210px', gap: 14, padding: 14 }}>
        {/* Gauche */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ ...panel, textAlign: 'center' }}>
            <Lbl>Puissance</Lbl>
            <div style={{ marginTop: 8 }}><span style={{ fontSize: 92, fontWeight: 800, lineHeight: 0.82, fontVariantNumeric: 'tabular-nums', color: 'var(--text)' }}>{d.power}</span><span style={{ fontSize: 20, color: 'var(--text-mid)', fontWeight: 800 }}>W</span></div>
            {v.current && <div style={{ fontSize: 14, color: 'var(--text-mid)', fontWeight: 800, marginTop: 6 }}>cible <b style={{ color: 'var(--primary)' }}>{d.targetW} W</b> · {d.pct} % FTP</div>}
            {v.current && <div style={{ marginTop: 14 }}><GaugeBar deltaW={d.deltaW} /></div>}
          </div>
          <div style={panel}>
            <Lbl>Bloc en cours</Lbl>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 6 }}>
              <span style={{ fontSize: 17, fontWeight: 800, color: 'var(--text)' }}>{v.current?.name ?? '—'}</span>
              <span style={{ fontSize: 12, color: 'var(--primary)', fontWeight: 800 }}>{d.repLabel}</span>
            </div>
            <div style={{ fontSize: 48, fontWeight: 800, marginTop: 8, textAlign: 'center', fontVariantNumeric: 'tabular-nums', color: 'var(--text)' }}>{v.plan ? fmtMs(d.countdownS) : fmtClock(v.t)}</div>
            <div style={{ textAlign: 'center', marginTop: 4 }}><Lbl>{v.plan ? 'Restant sur l’intervalle' : 'Temps écoulé'}</Lbl></div>
          </div>
          <div style={panel}><Lbl>Zones</Lbl><div style={{ marginTop: 8 }}><ZoneBar active={d.zone} /></div></div>
        </div>

        {/* Centre */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ ...panel, height: 250, display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', gap: 14, marginBottom: 6 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 800, color: 'var(--text-mid)' }}><span style={{ width: 14, height: 3, borderRadius: 2, background: 'var(--ride-power)' }} />Puissance</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 800, color: 'var(--text-mid)' }}><span style={{ width: 14, height: 3, borderRadius: 2, background: 'var(--ride-hr)' }} />Cardio</span>
              <span style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 800, color: 'var(--text-dim)' }}>10 dernières minutes</span>
            </div>
            <div style={{ flex: 1, minHeight: 0 }}><LiveChart samples={v.samples} ftp={v.ftp} fcMax={v.fcMax} windowS={600} t={v.t} /></div>
          </div>
          <div style={{ ...panel, height: 160 }}>
            <Lbl>Profil de séance · réel vs cible</Lbl>
            <div style={{ height: 118, marginTop: 6 }}><ProfileChart plan={v.plan} samples={v.samples} ftp={v.ftp} t={v.t} /></div>
          </div>
        </div>

        {/* Droite */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <Metric label="Cadence" value={d.cadence ?? '—'} unit="rpm" size={24} />
          <Metric label="Fréq. cardiaque" value={d.hr ?? '—'} unit="bpm" accent="var(--ride-hr)" size={24} />
          <Metric label="Puiss. moy" value={v.metrics.avgW} unit="W" size={24} />
          <Metric label="NP" value={v.metrics.np} unit="W" size={24} />
          <Metric label="IF" value={v.metrics.if.toFixed(2)} size={24} />
          <Metric label="Travail" value={v.metrics.kj} unit="kJ" size={24} />
          <Metric label="SM est." value={d.smEst} size={24} />
          <Metric label="Temps restant" value={v.plan ? fmtClock(d.remainingS) : '—'} size={24} />
        </div>
      </div>

      {/* Frise d'intervalles */}
      <div ref={stripRef} style={{ display: 'flex', gap: 8, padding: '0 14px 14px', overflowX: 'auto' }}>
        {v.plan?.blocks.map((b, i) => {
          const zc = ZONES[zoneIndex(b.targetW, v.ftp)].token
          const now = i === curIdx
          return (
            <div key={i} style={{ flexShrink: 0, minWidth: 118, background: 'var(--bg-card)', border: `1px solid ${now ? 'var(--primary)' : 'var(--border)'}`, borderRadius: 'var(--r-sm)', padding: '9px 13px', opacity: i < curIdx ? 0.42 : 1 }}>
              <div style={{ fontSize: 12, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text)' }}><span style={{ width: 3, height: 12, borderRadius: 2, background: zc }} />{b.name}{b.of ? ` ${b.rep}/${b.of}` : ''}</div>
              <div style={{ fontSize: 14, fontWeight: 800, marginTop: 4, fontVariantNumeric: 'tabular-nums', color: 'var(--text)' }}>{b.targetW} W</div>
              <div style={{ fontSize: 11, color: 'var(--text-mid)', fontWeight: 700 }}>{Math.round(b.durationS / 60)} min</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
