'use client'
// ════════════════════════════════════════════════════════════════════
// RouteSheet — feuille coulissante ouverte au tap sur le bandeau de stats bas
// de la carte live (façon Apple Plans). Contenu, de haut en bas :
//   1. Profil altimétrique du parcours (restant en bleu, réalisé en gris).
//   2. Bouton « Changer l'itinéraire ».
//   3. Commandes vocales : son activé/coupé + volume (plus fort / normal / moins fort).
//   4. Contrôles Mettre en pause / Reprendre + Terminer.
// Drag haut/bas fluide (repris de GuidePanel), fond translucide flou.
// ════════════════════════════════════════════════════════════════════
import { useEffect, useMemo, useRef, useState } from 'react'
import { useI18n } from '@/lib/i18n'

const ACCENT = '#06B6D4'       // design-allow-color
const DONE = '#9aa3ad'         // design-allow-color (portion réalisée, gris)
const SHEET_EASE = 'cubic-bezier(0.32, 0.72, 0, 1)'
const PEEK_H = 128

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
  voiceOn: boolean
  setVoiceOn: (v: boolean) => void
  volume: VoiceVolume
  setVolume: (v: VoiceVolume) => void
  onChangeRoute: () => void
  onClose: () => void
}

export default function RouteSheet({
  routeName, distLabel, gainLabel, ep, totalM, traveledM,
  started, paused, showPlayIcon, onPauseToggle, onFinish,
  voiceOn, setVoiceOn, volume, setVolume, onChangeRoute, onClose,
}: Props) {
  const { t } = useI18n()

  // ── Drag de la feuille (px, 0 = déployé) ──
  const wrapRef = useRef<HTMLDivElement>(null)
  const [mounted, setMounted] = useState(false)
  const [closing, setClosing] = useState(false)
  const [dy, setDy] = useState(0)
  const [dragging, setDragging] = useState(false)
  const collapsedYRef = useRef(340)
  const drag = useRef<{ startY: number; startDy: number } | null>(null)

  useEffect(() => {
    const h = wrapRef.current?.offsetHeight ?? 0
    collapsedYRef.current = Math.max(200, h - PEEK_H)
    const id = requestAnimationFrame(() => setMounted(true))
    return () => cancelAnimationFrame(id)
  }, [])

  const requestClose = () => { setClosing(true); setTimeout(onClose, 300) }
  const onGrabDown = (e: React.PointerEvent) => { drag.current = { startY: e.clientY, startDy: dy }; setDragging(true); (e.target as HTMLElement).setPointerCapture?.(e.pointerId) }
  const onGrabMove = (e: React.PointerEvent) => { if (!drag.current) return; setDy(Math.max(0, drag.current.startDy + (e.clientY - drag.current.startY))) }
  const onGrabUp = () => {
    if (!drag.current) return
    drag.current = null; setDragging(false)
    const collapsed = collapsedYRef.current
    if (dy > collapsed + 90) { requestClose(); return }
    setDy(dy > collapsed / 2 ? collapsed : 0)
  }
  const transform = closing ? 'translateY(100%)' : mounted ? `translateY(${dy}px)` : 'translateY(100%)'
  const grab = { onPointerDown: onGrabDown, onPointerMove: onGrabMove, onPointerUp: onGrabUp, onPointerCancel: onGrabUp }

  // ── Profil altimétrique : réalisé (gris) / restant (bleu) ──
  const chart = useMemo(() => {
    const W = 320, H = 92
    if (ep.length < 2 || totalM <= 0) return null
    const alts = ep.map(e => e.altitudeM)
    const aMin = Math.min(...alts), aMax = Math.max(...alts)
    const aR = (aMax - aMin) || 1
    const px = (d: number) => (d / totalM) * W
    const py = (a: number) => H - ((a - aMin) / aR) * (H - 10) - 5
    const pts = ep.map(e => `${px(e.distanceM).toFixed(1)},${py(e.altitudeM).toFixed(1)}`)
    const line = pts.join(' ')
    const areaAll = `0,${H} ${line} ${W},${H}`
    const doneEp = ep.filter(e => e.distanceM <= traveledM)
    const donePts = doneEp.map(e => `${px(e.distanceM).toFixed(1)},${py(e.altitudeM).toFixed(1)}`)
    const doneArea = doneEp.length ? `0,${H} ${donePts.join(' ')} ${px(traveledM).toFixed(1)},${H}` : ''
    const curAlt = doneEp.length ? doneEp[doneEp.length - 1].altitudeM : ep[0].altitudeM
    const dotX = px(Math.min(traveledM, totalM)), dotY = py(curAlt)
    return { W, H, line, areaAll, doneArea, dotX, dotY }
  }, [ep, totalM, traveledM])

  const SegBtn = ({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) => (
    <button onClick={onClick} style={{
      flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
      padding: '10px 6px', borderRadius: 12, border: 'none', cursor: 'pointer',
      background: on ? 'var(--live-accent-soft)' : 'var(--live-surface)',
      color: on ? 'var(--live-accent)' : 'var(--live-text-2)',
      fontSize: 13, fontWeight: 700, fontFamily: 'var(--font-body)',
    }}>{children}</button>
  )

  return (
    <div
      ref={wrapRef}
      style={{
        position: 'absolute', left: 12, right: 12, bottom: 12,
        maxHeight: 'calc(100% - env(safe-area-inset-top) - 92px)',
        borderRadius: 26, zIndex: 45,
        background: 'var(--live-guide-panel)', border: '1px solid var(--live-hairline-2)',
        backdropFilter: 'blur(26px) saturate(150%)', WebkitBackdropFilter: 'blur(26px) saturate(150%)',
        boxShadow: '0 10px 40px rgba(0,0,0,0.28)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        transform, transition: dragging ? 'none' : `transform 0.34s ${SHEET_EASE}`,
        touchAction: 'none',
      }}
    >
      {/* Poignée + en-tête (zone de drag) */}
      <div {...grab} style={{ flexShrink: 0, cursor: 'grab', touchAction: 'none' }}>
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 9, paddingBottom: 3 }}>
          <span style={{ width: 38, height: 5, borderRadius: 3, background: 'var(--live-hairline-2)' }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '6px 20px 14px', borderBottom: '1px solid var(--live-hairline)' }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 19, fontWeight: 800, lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {routeName || t('w3a.route_detail')}
            </div>
            <div className="lv2-num" style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--live-text-2)', marginTop: 3 }}>
              {distLabel}{gainLabel != null && ` · ${gainLabel}`}
            </div>
          </div>
          {started && (
            <button onClick={onFinish} style={{
              flexShrink: 0, height: 38, padding: '0 16px', borderRadius: 19, border: 'none', cursor: 'pointer',
              background: 'var(--live-danger, #ef4444)', color: '#fff', fontSize: 13.5, fontWeight: 800, fontFamily: 'var(--font-body)', // design-allow-color
            }}>{t('w2c.finish')}</button>
          )}
        </div>
      </div>

      {/* Contenu défilable */}
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '16px 20px 22px', WebkitOverflowScrolling: 'touch' as React.CSSProperties['WebkitOverflowScrolling'] }}>
        {/* 1. Profil altimétrique (réalisé gris / restant bleu) */}
        {chart && (
          <div style={{ marginBottom: 20 }}>
            <div className="lv2-eyebrow" style={{ fontSize: 10, letterSpacing: '0.14em', marginBottom: 8 }}>{t('w2c.elevProfile')}</div>
            <div style={{ position: 'relative', width: '100%' }}>
              <svg viewBox={`0 0 ${chart.W} ${chart.H}`} preserveAspectRatio="none" style={{ width: '100%', height: 92, display: 'block' }}>
                {/* Restant (bleu) : trait + aire */}
                <polygon points={chart.areaAll} fill={ACCENT} opacity={0.14} />
                <polyline points={chart.line} fill="none" stroke={ACCENT} strokeWidth={2.4} strokeLinejoin="round" strokeLinecap="round" />
                {/* Réalisé (gris) : recouvre la partie gauche */}
                {chart.doneArea && <polygon points={chart.doneArea} fill={DONE} opacity={0.5} />}
                {/* Point de progression */}
                <circle cx={chart.dotX} cy={chart.dotY} r={4.5} fill={ACCENT} stroke="#fff" strokeWidth={2} />
              </svg>
            </div>
          </div>
        )}

        {/* 2. Changer l'itinéraire */}
        <button onClick={onChangeRoute} style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '13px 15px', marginBottom: 20,
          borderRadius: 14, border: 'none', cursor: 'pointer', background: 'var(--live-surface)', color: 'var(--live-text)',
          fontSize: 15, fontWeight: 700, fontFamily: 'var(--font-body)', textAlign: 'left',
        }}>
          <span style={{ width: 34, height: 34, borderRadius: 10, flexShrink: 0, background: 'var(--live-accent-soft)', color: 'var(--live-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><circle cx="6" cy="6" r="2.5"/><circle cx="18" cy="18" r="2.5"/><path d="M8.5 6H15a3 3 0 0 1 0 6H9a3 3 0 0 0 0 6h6.5"/></svg>
          </span>
          <span style={{ flex: 1 }}>{t('w2c.changeRoute')}</span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--live-label)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
        </button>

        {/* 3. Commandes vocales */}
        <div style={{ marginBottom: 20 }}>
          <div className="lv2-eyebrow" style={{ fontSize: 10, letterSpacing: '0.14em', marginBottom: 8 }}>{t('w2c.voiceGuidance')}</div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <SegBtn on={voiceOn} onClick={() => setVoiceOn(true)}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M11 5 6 9H2v6h4l5 4V5z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M19 5a9 9 0 0 1 0 14"/></svg>
              {t('w2c.soundOn')}
            </SegBtn>
            <SegBtn on={!voiceOn} onClick={() => setVoiceOn(false)}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M11 5 6 9H2v6h4l5 4V5z"/><path d="M22 9l-6 6M16 9l6 6"/></svg>
              {t('w2c.soundOff')}
            </SegBtn>
          </div>
          <div style={{ display: 'flex', gap: 8, opacity: voiceOn ? 1 : 0.5, pointerEvents: voiceOn ? 'auto' : 'none' }}>
            {([['loud', 'w2c.volLoud'], ['normal', 'w2c.volNormal'], ['soft', 'w2c.volSoft']] as [VoiceVolume, string][]).map(([v, k]) => (
              <SegBtn key={v} on={volume === v} onClick={() => setVolume(v)}>{t(k)}</SegBtn>
            ))}
          </div>
        </div>

        {/* 4. Pause / Reprendre */}
        {started && (
          <button onClick={onPauseToggle} style={{
            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '15px',
            borderRadius: 16, border: 'none', cursor: 'pointer', background: 'var(--live-accent)', color: 'var(--live-accent-on)',
            fontSize: 16, fontWeight: 800, fontFamily: 'var(--font-body)',
          }}>
            {showPlayIcon
              ? <svg width="18" height="20" viewBox="0 0 26 30"><path d="M3 3 L23 15 L3 27 Z" fill="currentColor" stroke="currentColor" strokeWidth="4" strokeLinejoin="round" /></svg>
              : <svg width="16" height="16" viewBox="0 0 22 22"><rect x="3" y="3" width="6" height="16" rx="2" fill="currentColor" /><rect x="13" y="3" width="6" height="16" rx="2" fill="currentColor" /></svg>}
            {showPlayIcon ? t('w2c.resume') : t('w2c.pause')}
          </button>
        )}
      </div>
    </div>
  )
}
