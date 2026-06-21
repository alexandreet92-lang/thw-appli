'use client'

// Résumés annuels : feuille coulissante (bottom sheet) via createPortal sur
// document.body. Tout est calculé depuis les vraies mesures de l'année.
// Fermeture : bouton, tap backdrop, glissement vers le bas (mobile).

import { useRef, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import type { YearSummary } from './compositionData'

const FB = 'var(--font-body)', FD = 'var(--font-display)'

function Spark({ pts }: { pts: { t: number; v: number }[] }) {
  if (pts.length < 2) return null
  const W = 280, H = 56, P = 4
  const xs = pts.map(p => p.t), vs = pts.map(p => p.v)
  const t0 = xs[0], tspan = (xs[xs.length - 1] - t0) || 1
  const minV = Math.min(...vs), range = (Math.max(...vs) - minV) || 1
  const d = pts.map((p, i) => `${i ? 'L' : 'M'}${(P + ((p.t - t0) / tspan) * (W - 2 * P)).toFixed(1)},${(P + (1 - (p.v - minV) / range) * (H - 2 * P)).toFixed(1)}`).join(' ')
  return (
    <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} style={{ display: 'block' }}>
      <path d={d} fill="none" stroke="var(--primary)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  )
}

export function AnnualSheet({ summary, metricLabel, unit, onClose }: { summary: YearSummary; metricLabel: string; unit: string; onClose: () => void }) {
  const startY = useRef<number | null>(null)
  const [closing, setClosing] = useState(false)
  // Fermeture animée : on joue le glissement vers le bas avant de démonter.
  const requestClose = useCallback(() => {
    setClosing(true)
    setTimeout(onClose, 260)
  }, [onClose])
  const stat = (label: string, value: string) => (
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontFamily: FB, fontSize: 11, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--text-dim)' }}>{label}</div>
      <div className="tnum" style={{ fontFamily: FB, fontSize: 20, fontWeight: 600, color: 'var(--text)', marginTop: 'var(--space-1)' }}>{value}</div>
    </div>
  )
  return createPortal(
    <div onClick={requestClose} style={{ position: 'fixed', inset: 0, zIndex: 3000 }}>
      <div style={{ position: 'fixed', inset: 0, background: 'var(--text)', opacity: 0.32,
        animation: `${closing ? 'fadeOutOverlay' : 'fadeInOverlay'} 260ms ease both` }} />
      <div
        onClick={e => e.stopPropagation()}
        onTouchStart={e => { startY.current = e.touches[0].clientY }}
        onTouchEnd={e => { if (startY.current != null && e.changedTouches[0].clientY - startY.current > 60) requestClose() }}
        style={{ position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 1, margin: '0 auto', maxWidth: 560,
          background: 'var(--bg-card)', borderRadius: 'var(--r-lg) var(--r-lg) 0 0', padding: 'var(--space-6)',
          animation: `${closing ? 'sheet-close' : 'sheet-open'} 280ms cubic-bezier(0.16,1,0.3,1) both` }}
      >
        <div style={{ width: 36, height: 4, borderRadius: 'var(--r-sm)', background: 'var(--border)', margin: '0 auto var(--space-4)' }} />
        <h2 style={{ fontFamily: FD, fontSize: 20, fontWeight: 600, color: 'var(--text)', margin: '0 0 var(--space-1)' }}>{summary.year} · {metricLabel}</h2>
        <div style={{ fontFamily: FB, fontSize: 12, color: 'var(--text-mid)', marginBottom: 'var(--space-4)' }}>
          <span className="tnum">{summary.count}</span> mesure{summary.count > 1 ? 's' : ''} sur l&apos;année
        </div>
        <div style={{ marginBottom: 'var(--space-4)' }}><Spark pts={summary.pts} /></div>
        <div style={{ display: 'flex', gap: 'var(--space-4)', marginBottom: 'var(--space-2)' }}>
          {stat('Max', `${summary.max}${unit}`)}
          {stat('Min', `${summary.min}${unit}`)}
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-4)', marginBottom: 'var(--space-5)' }}>
          {stat('Amplitude', `${summary.amplitude}${unit}`)}
          {stat('Variation', `${summary.delta > 0 ? '+' : ''}${summary.delta}${unit}`)}
        </div>
        <button onClick={requestClose} style={{ width: '100%', height: 40, border: 'none', borderRadius: 'var(--r-sm)',
          background: 'var(--bg-card2)', color: 'var(--text)', fontFamily: FB, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
          Fermer
        </button>
      </div>
    </div>,
    document.body,
  )
}
