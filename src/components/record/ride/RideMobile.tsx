'use client'
// Écran mobile : 4 pages en défilement horizontal (scroll-snap) + points de
// pagination, barres haute/basse persistantes. Les pages consomment la vue-modèle.
import { useRef, useState } from 'react'
import { IconPlayerPauseFilled } from '@tabler/icons-react'
import RidePilot from './pages/RidePilot'
import RideFlux from './pages/RideFlux'
import RideProfile from './pages/RideProfile'
import RideData from './pages/RideData'
import SensorDots from './ui/SensorDots'
import { Lbl } from './ui/atoms'
import { fmtClock } from './format'
import type { RideView, Derived } from './viewModel'
import type { SensorStatus } from './useSensors'

interface Props {
  v: RideView; d: Derived
  status: Record<'trainer' | 'hr' | 'cadence', SensorStatus>
  onTogglePause: () => void; onFinish: () => void
}

export default function RideMobile({ v, d, status, onTogglePause, onFinish }: Props) {
  const pagesRef = useRef<HTMLDivElement>(null)
  const [page, setPage] = useState(0)
  const onScroll = () => {
    const el = pagesRef.current; if (!el) return
    setPage(Math.round(el.scrollLeft / el.clientWidth))
  }
  const pageStyle: React.CSSProperties = { minWidth: '100%', scrollSnapAlign: 'start', display: 'flex', flexDirection: 'column', padding: '0 16px', minHeight: 0 }

  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', background: 'var(--bg)', paddingTop: 'env(safe-area-inset-top)' }}>
      {/* Barre haute */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px' }}>
        <button onClick={onTogglePause} aria-label="Pause" style={{ width: 36, height: 36, borderRadius: 'var(--r-md)', background: 'var(--bg-card)', border: '1px solid var(--border)', display: 'grid', placeItems: 'center', cursor: 'pointer', color: 'var(--text)' }}>
          <IconPlayerPauseFilled size={16} />
        </button>
        <div style={{ flex: 1, textAlign: 'center', minWidth: 0 }}>
          <div style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-mid)', fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{v.plan?.title ?? 'Sortie libre'}</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--primary)', fontVariantNumeric: 'tabular-nums' }}>{fmtClock(v.t)}</div>
        </div>
        <SensorDots status={status} />
      </div>

      {/* Pages */}
      <div ref={pagesRef} onScroll={onScroll} style={{ flex: 1, display: 'flex', overflowX: 'auto', overflowY: 'hidden', scrollSnapType: 'x mandatory', minHeight: 0 }}>
        <div style={pageStyle}><RidePilot v={v} d={d} /></div>
        <div style={pageStyle}><RideFlux v={v} d={d} /></div>
        <div style={pageStyle}><RideProfile v={v} /></div>
        <div style={pageStyle}><RideData v={v} d={d} status={status} /></div>
      </div>

      {/* Points de pagination */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 6, padding: '8px 0 4px' }}>
        {[0, 1, 2, 3].map(i => (
          <span key={i} style={{ height: 6, width: i === page ? 18 : 6, borderRadius: 3, background: i === page ? 'var(--primary)' : 'var(--bg-elev)', transition: '.2s' }} />
        ))}
      </div>

      {/* Barre basse */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '2px 16px 20px' }}>
        <div style={{ flex: 1 }}><Lbl>Écoulé</Lbl><div style={{ fontSize: 19, fontWeight: 800, fontVariantNumeric: 'tabular-nums', color: 'var(--text)' }}>{fmtClock(v.t)}</div></div>
        <div style={{ flex: 1 }}><Lbl>Travail</Lbl><div style={{ fontSize: 19, fontWeight: 800, fontVariantNumeric: 'tabular-nums', color: 'var(--text)' }}>{v.metrics.kj}<small style={{ fontSize: 10, color: 'var(--text-mid)', fontWeight: 700, marginLeft: 1 }}>kJ</small></div></div>
        <div style={{ flex: 1 }}><Lbl>SM est.</Lbl><div style={{ fontSize: 19, fontWeight: 800, fontVariantNumeric: 'tabular-nums', color: 'var(--text)' }}>{d.smEst}</div></div>
        <button onClick={onFinish} style={{ padding: '11px 16px', borderRadius: 'var(--r-md)', background: 'var(--bg-card)', border: '1px solid var(--border-mid)', color: 'var(--text)', fontSize: 13, fontWeight: 800, cursor: 'pointer' }}>Terminer</button>
      </div>
    </div>
  )
}
