'use client'
// Écran mobile : 4 pages en défilement horizontal (scroll-snap) + points de
// pagination, barres haute/basse persistantes. Les pages consomment la vue-modèle.
import { useRef, useState } from 'react'
import { useI18n } from '@/lib/i18n'
import RidePilot from './pages/RidePilot'
import RideFlux from './pages/RideFlux'
import RideProfile from './pages/RideProfile'
import RideData from './pages/RideData'
import SensorDots from './ui/SensorDots'
import { RkFabSpacer, RkStatusPill, RK_DOT, RkPageDots, RkControlRow, RkBigButton, RkFab, RkIco, RK_ICON, PauseGlyph } from '../kit/RecordKit'
// onEdit : ouvre la feuille « Modifier la séance » (édition des blocs en direct).
import { fmtClock } from './format'
import type { RideView, Derived } from './viewModel'
import type { SensorStatus } from './useSensors'

interface Props {
  v: RideView; d: Derived
  status: Record<'trainer' | 'hr' | 'cadence', SensorStatus>
  /** Séance guidée sans capteur de puissance : on n'affiche QUE le profil de
   *  séance (cibles watts par intervalle) — les autres pages (pilotage, flux,
   *  data) sont inutiles sans appareil connecté. */
  soloProfile?: boolean
  onTogglePause: () => void; onFinish: () => void; onStopTest?: () => void; onEdit?: () => void
}

export default function RideMobile({ v, d, status, soloProfile = false, onTogglePause, onFinish, onStopTest, onEdit }: Props) {
  const { t } = useI18n()
  const pagesRef = useRef<HTMLDivElement>(null)
  const [page, setPage] = useState(0)
  const onScroll = () => {
    const el = pagesRef.current; if (!el) return
    setPage(Math.round(el.scrollLeft / el.clientWidth))
  }
  const pageStyle: React.CSSProperties = { minWidth: '100%', scrollSnapAlign: 'start', display: 'flex', flexDirection: 'column', padding: '0 16px', minHeight: 0, overflowY: 'auto' }

  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', background: 'var(--surface-page)' }}>
      {/* En-tête : pilule d'état (séance + chrono) · capteurs */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 'calc(env(safe-area-inset-top) + 7px) 14px 8px' }}>
        {onEdit
          ? <RkFab label={t('ht.editSession')} onClick={onEdit}><RkIco d={RK_ICON.edit} size={18} /></RkFab>
          : <RkFabSpacer />}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', justifyContent: 'center' }}>
          <RkStatusPill dot={RK_DOT.rec} live>
            {v.plan?.title ?? t('w3b.free_ride')} · <span className="rk-num" style={{ letterSpacing: 0 }}>{fmtClock(v.t)}</span>
          </RkStatusPill>
        </div>
        <span className="rk-fab" style={{ width: 44, height: 44, cursor: 'default' }} aria-hidden><SensorDots status={status} /></span>
      </div>

      {/* Pages — sans capteur de puissance : uniquement le profil de séance
          (cibles watts par intervalle) ; les pages de stats live sont masquées. */}
      {soloProfile ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '0 16px', minHeight: 0 }}><RideProfile v={v} /></div>
      ) : (
        <div ref={pagesRef} onScroll={onScroll} style={{ flex: 1, display: 'flex', overflowX: 'auto', overflowY: 'hidden', scrollSnapType: 'x mandatory', minHeight: 0, scrollbarWidth: 'none' }}>
          <div style={pageStyle}><RidePilot v={v} d={d} onStopTest={onStopTest} /></div>
          <div style={pageStyle}><RideFlux v={v} d={d} /></div>
          <div style={pageStyle}><RideProfile v={v} /></div>
          <div style={pageStyle}><RideData v={v} d={d} status={status} /></div>
        </div>
      )}

      {/* Pagination (masquée en mode profil seul) */}
      {!soloProfile && (
        <RkPageDots count={4} index={page} style={{ padding: '8px 0 2px' }}
          onSelect={i => { const el = pagesRef.current; if (el) el.scrollTo({ left: i * el.clientWidth, behavior: 'smooth' }) }} />
      )}

      {/* Bandeau chiffres + contrôles ronds */}
      <div style={{ padding: '6px 16px calc(env(safe-area-inset-bottom) + 18px)', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div className="rk-card" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 1, background: 'var(--border)' }}>
          {[
            { l: t('w3b.elapsed'), v: fmtClock(v.t) },
            { l: t('w3b.work'), v: String(v.metrics.kj), u: 'kJ' },
            { l: t('w3b.sm_est'), v: String(d.smEst) },
          ].map(c => (
            <div key={c.l} className="rk-cell" style={{ padding: '10px 6px 12px' }}>
              <div className="rk-label" style={{ fontSize: 12 }}>{c.l}</div>
              <div className="rk-cell-v"><span className="rk-cell-n rk-num" style={{ fontSize: 22 }}>{c.v}</span>{c.u && <span className="rk-cell-u" style={{ fontSize: 13 }}>{c.u}</span>}</div>
            </div>
          ))}
        </div>
        <RkControlRow
          center={<RkBigButton label={t('w3b.pause')} onClick={onTogglePause}><PauseGlyph /></RkBigButton>}
          right={<RkFab label={t('w3b.finish')} onClick={onFinish} size={56}><RkIco d={RK_ICON.flag} size={22} /></RkFab>}
        />
      </div>
    </div>
  )
}
