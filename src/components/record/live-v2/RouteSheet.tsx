'use client'
// ════════════════════════════════════════════════════════════════════
// RouteSheet — feuille de contrôle de la carte live, façon Apple Plans.
//  • Repliée (peek) : DONNÉES dans la bulle → en haut Watts + FC, puis grande
//    ligne Distance restante · Temps restant (arrivée) · D+ restant.
//  • Dépliée (drag vers le haut / tap poignée) : + profil altimétrique
//    (restant bleu / réalisé gris), bouton « Changer l'itinéraire », bouton
//    « Commandes vocales », Pause/Reprendre + Terminer.
//  • Sous-pages qui GLISSENT depuis la droite :
//     - « Commandes vocales » : Son coupé / activé + Volume.
//     - « Changer l'itinéraire » : CHOIX → un parcours enregistré OU une adresse.
//  • Se referme : tap sur la poignée OU tirer vers le bas → revient au peek.
//  Fond blanc frosté translucide (voir la carte au travers).
// ════════════════════════════════════════════════════════════════════
import { useEffect, useMemo, useRef, useState } from 'react'
import { useI18n } from '@/lib/i18n'

const ACCENT = '#06B6D4'   // design-allow-color
const DONE = '#9aa3ad'     // design-allow-color (réalisé, gris)
const EASE = 'cubic-bezier(0.32, 0.72, 0, 1)'
const PEEK_H = 150         // hauteur visible repliée

export type VoiceVolume = 'loud' | 'normal' | 'soft'

interface Props {
  routeName: string | null
  distLabel: string
  gainLabel: string | null
  ep: { distanceM: number; altitudeM: number }[]
  totalM: number
  traveledM: number
  started: boolean
  paused: boolean
  showPlayIcon: boolean
  onPauseToggle: () => void
  onFinish: () => void
  onLap: () => void
  canLap: boolean
  voiceOn: boolean
  setVoiceOn: (v: boolean) => void
  volume: VoiceVolume
  setVolume: (v: VoiceVolume) => void
  /** Ouvre le sélecteur de parcours : 'library' (parcours enregistrés) ou 'search' (adresse). */
  onOpenRoutePicker: (mode: 'library' | 'search') => void
  /** Vue courante (contrôlée : les boutons ronds de la carte peuvent l'ouvrir). */
  view: 'main' | 'voice' | 'route'
  onSetView: (v: 'main' | 'voice' | 'route') => void
  // ── Données du peek ──
  watts: string
  hr: string
  remainDistLabel: string
  remainDistUnit: string
  remainTimeLabel: string
  remainTimeUnit?: string
  arrivalLabel: string | null
  remainGainLabel: string | null
  remainGainUnit: string
}

export default function RouteSheet(p: Props) {
  const { t } = useI18n()
  const view = p.view
  const setView = p.onSetView

  // ── Position de la feuille : repliée (peek) ⇄ dépliée. ──
  const wrapRef = useRef<HTMLDivElement>(null)
  const [expandedH, setExpandedH] = useState(360)
  const [dy, setDy] = useState(9999)        // grand = replié tant que non mesuré
  const [dragging, setDragging] = useState(false)
  const [mounted, setMounted] = useState(false)
  const drag = useRef<{ y0: number; dy0: number } | null>(null)

  const collapsedY = Math.max(0, expandedH - PEEK_H)

  useEffect(() => {
    const measure = () => {
      const h = wrapRef.current?.scrollHeight ?? 360
      setExpandedH(h)
      setDy(prev => (prev === 9999 ? Math.max(0, h - PEEK_H) : prev))
    }
    measure()
    const id = requestAnimationFrame(() => setMounted(true))
    return () => cancelAnimationFrame(id)
  }, [view])

  const snapTo = (target: 'peek' | 'open') => setDy(target === 'open' ? 0 : collapsedY)
  const toggle = () => setDy(dy > collapsedY / 2 ? 0 : collapsedY)

  const onDown = (e: React.PointerEvent) => { drag.current = { y0: e.clientY, dy0: dy }; setDragging(true); (e.target as HTMLElement).setPointerCapture?.(e.pointerId) }
  const onMove = (e: React.PointerEvent) => { if (!drag.current) return; setDy(Math.max(0, Math.min(collapsedY, drag.current.dy0 + (e.clientY - drag.current.y0)))) }
  const onUp = () => { if (!drag.current) return; drag.current = null; setDragging(false); snapTo(dy > collapsedY / 2 ? 'peek' : 'open') }

  // Sous-page ouverte → feuille entièrement déployée ; sinon peek/expand selon dy.
  const transform = !mounted ? 'translateY(100%)' : view !== 'main' ? 'translateY(0px)' : `translateY(${dy === 9999 ? collapsedY : dy}px)`

  // ── Profil altimétrique (réalisé gris / restant bleu). ──
  const chart = useMemo(() => {
    const W = 320, H = 96
    if (p.ep.length < 2 || p.totalM <= 0) return null
    const alts = p.ep.map(e => e.altitudeM)
    const aMin = Math.min(...alts), aMax = Math.max(...alts), aR = (aMax - aMin) || 1
    const px = (d: number) => (d / p.totalM) * W
    const py = (a: number) => H - ((a - aMin) / aR) * (H - 12) - 6
    const pts = p.ep.map(e => `${px(e.distanceM).toFixed(1)},${py(e.altitudeM).toFixed(1)}`).join(' ')
    const areaAll = `0,${H} ${pts} ${W},${H}`
    const done = p.ep.filter(e => e.distanceM <= p.traveledM)
    const doneArea = done.length ? `0,${H} ${done.map(e => `${px(e.distanceM).toFixed(1)},${py(e.altitudeM).toFixed(1)}`).join(' ')} ${px(p.traveledM).toFixed(1)},${H}` : ''
    const curAlt = done.length ? done[done.length - 1].altitudeM : p.ep[0].altitudeM
    return { W, H, pts, areaAll, doneArea, dotX: px(Math.min(p.traveledM, p.totalM)), dotY: py(curAlt) }
  }, [p.ep, p.totalM, p.traveledM])

  // ── Briques UI ──
  const Metric = ({ label, value, unit, sub }: { label: string; value: string; unit?: string; sub?: string | null }) => (
    <div style={{ flex: 1, textAlign: 'center', position: 'relative' }}>
      <div className="lv2-eyebrow" style={{ fontSize: 10, letterSpacing: '0.12em' }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 4, marginTop: 5 }}>
        <span className="lv2-num" style={{ fontSize: 27, fontWeight: 800, lineHeight: 1 }}>{value}</span>
        {unit && <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--live-label)' }}>{unit}</span>}
      </div>
      {sub && <div className="lv2-num" style={{ fontSize: 11, fontWeight: 500, color: 'var(--live-dim-sub)', marginTop: 4 }}>{sub}</div>}
    </div>
  )
  const Row = ({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) => (
    <button onClick={onClick} style={{
      width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '13px 15px',
      borderRadius: 16, border: 'none', cursor: 'pointer', background: 'var(--live-surface)', color: 'var(--live-text)',
      fontSize: 15, fontWeight: 700, fontFamily: 'var(--font-body)', textAlign: 'left',
    }}>
      <span style={{ width: 34, height: 34, borderRadius: 12, flexShrink: 0, background: 'var(--live-accent-soft)', color: 'var(--live-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{icon}</span>
      <span style={{ flex: 1 }}>{label}</span>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--live-label)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
    </button>
  )
  const Seg = ({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) => (
    <button onClick={onClick} style={{
      flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, padding: '13px 8px',
      borderRadius: 14, border: 'none', cursor: 'pointer',
      background: on ? 'var(--live-accent-soft)' : 'var(--live-surface)', color: on ? 'var(--live-accent)' : 'var(--live-text-2)',
      fontSize: 14, fontWeight: 700, fontFamily: 'var(--font-body)',
    }}>{children}</button>
  )
  const SubHeader = ({ title }: { title: string }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 4px 16px' }}>
      <button onClick={() => setView('main')} aria-label="Retour" style={{ width: 34, height: 34, borderRadius: '50%', border: 'none', cursor: 'pointer', background: 'var(--live-surface)', color: 'var(--live-text)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
      </button>
      <span style={{ fontSize: 19, fontWeight: 800, fontFamily: 'var(--font-body)' }}>{title}</span>
    </div>
  )

  const speaker = (muted: boolean) => (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 5 6 9H2v6h4l5 4V5z" />
      {muted ? <path d="M22 9l-6 6M16 9l6 6" /> : <path d="M15.5 8.5a5 5 0 0 1 0 7M19 5a9 9 0 0 1 0 14" />}
    </svg>
  )

  return (
    <div
      ref={wrapRef}
      style={{
        position: 'absolute', left: 10, right: 10, bottom: 'calc(env(safe-area-inset-bottom) + 8px)',
        maxHeight: 'calc(100% - env(safe-area-inset-top) - 150px)',
        borderRadius: 28, zIndex: 45, overflow: 'hidden',
        background: 'var(--live-guide-panel)', border: '1px solid var(--live-hairline-2)',
        backdropFilter: 'blur(30px) saturate(180%)', WebkitBackdropFilter: 'blur(30px) saturate(180%)',
        boxShadow: '0 12px 44px rgba(0,0,0,0.26)',
        transform, transition: dragging ? 'none' : `transform 0.4s ${EASE}`,
        display: 'flex', flexDirection: 'column',
      }}
    >
      {/* ══ Vue principale ══ */}
      <div hidden={view !== 'main'} style={{ display: view === 'main' ? 'flex' : 'none', flexDirection: 'column', minHeight: 0 }}>
        {/* Poignée + DONNÉES (peek) — zone de drag / tap pour replier-déplier */}
        <div
          onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}
          onClick={() => { if (!dragging) toggle() }}
          style={{ flexShrink: 0, cursor: 'grab', touchAction: 'none', padding: '9px 14px 14px' }}
        >
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10 }}>
            <span style={{ width: 40, height: 5, borderRadius: 3, background: 'var(--live-hairline-2)' }} />
          </div>
          {/* Watts + FC (en haut de la bulle) */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 28, marginBottom: 12 }}>
            {[['W', p.watts], [t('w2c.hr'), p.hr]].map(([lb, v]) => (
              <div key={lb} style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
                <span className="lv2-num" style={{ fontSize: 18, fontWeight: 800 }}>{v}</span>
                <span style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: '0.1em', color: 'var(--live-label)' }}>{lb}</span>
              </div>
            ))}
          </div>
          {/* Distance restante · Temps restant (arrivée) · D+ restant */}
          <div style={{ display: 'flex' }}>
            <Metric label={t('w2c.remainingLabel')} value={p.remainDistLabel} unit={p.remainDistUnit} />
            <span style={{ width: 1, background: 'var(--live-hairline)', margin: '2px 0' }} />
            <Metric label={t('w2c.estTime')} value={p.remainTimeLabel} unit={p.remainTimeUnit} sub={p.arrivalLabel} />
            {p.remainGainLabel != null && <>
              <span style={{ width: 1, background: 'var(--live-hairline)', margin: '2px 0' }} />
              <Metric label={t('w2c.elevRemaining')} value={p.remainGainLabel} unit={p.remainGainUnit} />
            </>}
          </div>
        </div>

        {/* Contenu déplié (défilable) */}
        <div style={{ overflowY: 'auto', padding: '4px 16px 18px', WebkitOverflowScrolling: 'touch' as React.CSSProperties['WebkitOverflowScrolling'] }}>
          {chart && (
            <div style={{ marginBottom: 16 }}>
              <div className="lv2-eyebrow" style={{ fontSize: 10, letterSpacing: '0.13em', marginBottom: 8 }}>{t('w2c.elevProfile')}</div>
              <svg viewBox={`0 0 ${chart.W} ${chart.H}`} preserveAspectRatio="none" style={{ width: '100%', height: 90, display: 'block' }}>
                <polygon points={chart.areaAll} fill={ACCENT} opacity={0.14} />
                <polyline points={chart.pts} fill="none" stroke={ACCENT} strokeWidth={2.4} strokeLinejoin="round" strokeLinecap="round" />
                {chart.doneArea && <polygon points={chart.doneArea} fill={DONE} opacity={0.55} />}
                <circle cx={chart.dotX} cy={chart.dotY} r={4.5} fill={ACCENT} stroke="#fff" strokeWidth={2} />
              </svg>
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <Row onClick={() => setView('route')} label={t('w2c.changeRoute')}
              icon={<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><circle cx="6" cy="6" r="2.5"/><circle cx="18" cy="18" r="2.5"/><path d="M8.5 6H15a3 3 0 0 1 0 6H9a3 3 0 0 0 0 6h6.5"/></svg>} />
            <Row onClick={() => setView('voice')} label={t('w2c.voiceGuidance')} icon={speaker(!p.voiceOn)} />
          </div>
          {p.started && (
            <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
              <button onClick={p.onPauseToggle} style={{ flex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9, padding: 15, borderRadius: 16, border: 'none', cursor: 'pointer', background: 'var(--live-accent)', color: 'var(--live-accent-on)', fontSize: 15.5, fontWeight: 800, fontFamily: 'var(--font-body)' }}>
                {p.showPlayIcon
                  ? <svg width="17" height="19" viewBox="0 0 26 30"><path d="M3 3 L23 15 L3 27 Z" fill="currentColor" stroke="currentColor" strokeWidth="4" strokeLinejoin="round" /></svg>
                  : <svg width="15" height="15" viewBox="0 0 22 22"><rect x="3" y="3" width="6" height="16" rx="2" fill="currentColor" /><rect x="13" y="3" width="6" height="16" rx="2" fill="currentColor" /></svg>}
                {p.showPlayIcon ? t('w2c.resume') : t('w2c.pause')}
              </button>
              {p.canLap && (
                <button onClick={p.onLap} style={{ flex: 1, padding: 15, borderRadius: 16, border: 'none', cursor: 'pointer', background: 'var(--live-surface)', color: 'var(--live-text)', fontSize: 13, fontWeight: 800, letterSpacing: '0.06em', fontFamily: 'var(--font-body)' }}>LAP</button>
              )}
              <button onClick={p.onFinish} style={{ flex: 1, padding: 15, borderRadius: 16, border: 'none', cursor: 'pointer', background: 'var(--live-danger, #ef4444)', color: '#fff', fontSize: 15.5, fontWeight: 800, fontFamily: 'var(--font-body)' }}>{t('w2c.finish')}</button>
            </div>
          )}
        </div>
      </div>

      {/* ══ Sous-page Commandes vocales ══ */}
      {view === 'voice' && (
        <div style={{ padding: '14px 16px 20px', animation: `lv2slideIn 0.28s ${EASE}` }}>
          <SubHeader title={t('w2c.voiceGuidance')} />
          <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
            <Seg on={p.voiceOn} onClick={() => p.setVoiceOn(true)}>{speaker(false)}{t('w2c.soundOn')}</Seg>
            <Seg on={!p.voiceOn} onClick={() => p.setVoiceOn(false)}>{speaker(true)}{t('w2c.soundOff')}</Seg>
          </div>
          <div className="lv2-eyebrow" style={{ fontSize: 10, letterSpacing: '0.13em', margin: '10px 2px 8px' }}>{t('w2c.volume')}</div>
          <div style={{ display: 'flex', gap: 8, opacity: p.voiceOn ? 1 : 0.45, pointerEvents: p.voiceOn ? 'auto' : 'none' }}>
            {([['loud', 'w2c.volLoud'], ['normal', 'w2c.volNormal'], ['soft', 'w2c.volSoft']] as [VoiceVolume, string][]).map(([v, k]) => (
              <Seg key={v} on={p.volume === v} onClick={() => p.setVolume(v)}>{t(k)}</Seg>
            ))}
          </div>
        </div>
      )}

      {/* ══ Sous-page Changer l'itinéraire (CHOIX) ══ */}
      {view === 'route' && (
        <div style={{ padding: '14px 16px 20px', animation: `lv2slideIn 0.28s ${EASE}` }}>
          <SubHeader title={t('w2c.changeRoute')} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <button onClick={() => p.onOpenRoutePicker('library')} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 16px', borderRadius: 18, border: 'none', cursor: 'pointer', background: 'var(--live-surface)', color: 'var(--live-text)', textAlign: 'left', fontFamily: 'var(--font-body)' }}>
              <span style={{ width: 42, height: 42, borderRadius: 13, flexShrink: 0, background: 'var(--live-accent-soft)', color: 'var(--live-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><circle cx="6" cy="6" r="2.5"/><circle cx="18" cy="18" r="2.5"/><path d="M8.5 6H15a3 3 0 0 1 0 6H9a3 3 0 0 0 0 6h6.5"/></svg>
              </span>
              <span style={{ minWidth: 0 }}>
                <span style={{ display: 'block', fontSize: 15.5, fontWeight: 800 }}>{t('w2c.pickSavedRoute')}</span>
                <span style={{ display: 'block', fontSize: 12.5, color: 'var(--live-text-2)', marginTop: 2 }}>{t('w2c.pickSavedRouteSub')}</span>
              </span>
            </button>
            <button onClick={() => p.onOpenRoutePicker('search')} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 16px', borderRadius: 18, border: 'none', cursor: 'pointer', background: 'var(--live-surface)', color: 'var(--live-text)', textAlign: 'left', fontFamily: 'var(--font-body)' }}>
              <span style={{ width: 42, height: 42, borderRadius: 13, flexShrink: 0, background: 'var(--live-accent-soft)', color: 'var(--live-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>
              </span>
              <span style={{ minWidth: 0 }}>
                <span style={{ display: 'block', fontSize: 15.5, fontWeight: 800 }}>{t('w2c.searchAddress')}</span>
                <span style={{ display: 'block', fontSize: 12.5, color: 'var(--live-text-2)', marginTop: 2 }}>{t('w2c.searchAddressSub')}</span>
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
