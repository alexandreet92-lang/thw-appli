'use client'
// ══════════════════════════════════════════════════════════════
// Carte graphe (MOBILE) — maquette « a3-actions » (milieu) :
// carte blanche · titre + méta (« interactif · 8 points · TSS ») + chevron ·
// sparkline pleine largeur qui se dessine (ligne) ou pousse (barres).
// Le tap ouvre la vue détaillée en bottom sheet (glisser pour fermer).
// ══════════════════════════════════════════════════════════════

import { useState, type ReactNode } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { MobileSheet } from '../../MobileSheet'
import { AimSheetHeader } from '../SheetParts'
import { AimCard, AimPress, AIM_EASE } from './kit'

export function Sparkline({ values, type = 'line', color = 'var(--primary)', height = 76 }: {
  values: number[]
  type?: 'line' | 'bar' | 'area'
  color?: string
  height?: number
}) {
  const reduce = useReducedMotion()
  const W = 326, H = height, P = 6
  const n = values.length
  if (n === 0) return null
  const lo = type === 'line' ? Math.min(...values) : Math.min(0, ...values)
  const hi = Math.max(...values, lo + 1e-6)
  const span = hi - lo || 1
  const x = (i: number) => (n <= 1 ? W / 2 : P + (i / (n - 1)) * (W - 2 * P))
  const y = (v: number) => H - P - ((v - lo) / span) * (H - 2 * P)
  if (type === 'bar') {
    const band = W / n, bw = Math.max(3, band * 0.62)
    return (
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} preserveAspectRatio="none" aria-hidden style={{ display: 'block' }}>
        {values.map((v, i) => {
          const top = y(v), h = Math.max(3, H - P - top)
          return (
            <motion.rect key={i} x={band * i + (band - bw) / 2} y={H - P - h} width={bw} height={h} rx={Math.min(4, bw / 2)} fill={color}
              style={{ transformBox: 'fill-box', transformOrigin: '50% 100%' }}
              initial={reduce ? false : { scaleY: 0 }} animate={{ scaleY: 1 }}
              transition={{ duration: 0.55, ease: AIM_EASE, delay: 0.1 + i * 0.03 }} />
          )
        })}
      </svg>
    )
  }
  const d = values.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(' ')
  const area = `${d} L${x(n - 1).toFixed(1)} ${H - P} L${x(0).toFixed(1)} ${H - P} Z`
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} preserveAspectRatio="none" aria-hidden style={{ display: 'block', overflow: 'visible' }}>
      {type === 'area' && (
        <motion.path d={area} fill={color} initial={reduce ? false : { opacity: 0 }} animate={{ opacity: 0.14 }} transition={{ duration: 0.6, delay: 0.3 }} />
      )}
      <motion.path d={d} fill="none" stroke={color} strokeWidth={3} strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke"
        initial={reduce ? false : { pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.9, ease: AIM_EASE, delay: 0.1 }} />
      <motion.circle cx={x(n - 1)} cy={y(values[n - 1])} r={5} fill={color}
        initial={reduce ? false : { scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.3, ease: AIM_EASE, delay: 0.95 }} style={{ transformBox: 'fill-box', transformOrigin: 'center' }} />
    </svg>
  )
}

export function ChartCardMobile({ title, meta, values, type, viewer, closeLabel }: {
  title: string
  meta: string
  values: number[]
  type?: 'line' | 'bar' | 'area'
  /** Contenu de la vue détaillée (graphe interactif). */
  viewer: ReactNode
  closeLabel?: string
}) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <AimPress onClick={() => setOpen(true)} ariaLabel={title} style={{ display: 'block', width: '100%' }}>
        <AimCard>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: 'block', fontSize: 16, fontWeight: 800, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</span>
              <span className="aimc-num" style={{ display: 'block', fontSize: 13, color: 'var(--text-mid)', marginTop: 1 }}>{meta}</span>
            </span>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-dim)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden style={{ flexShrink: 0 }}><path d="m9 18 6-6-6-6" /></svg>
          </div>
          <div style={{ marginTop: 10 }}><Sparkline values={values} type={type} /></div>
        </AimCard>
      </AimPress>
      {open && (
        <MobileSheet
          onClose={() => setOpen(false)}
          surface="var(--surface-card)"
          zIndex={10000}
          renderHeader={close => <AimSheetHeader title={title} onClose={close} />}
        >
          <div style={{ padding: '0 8px 16px' }} aria-label={closeLabel}>{viewer}</div>
        </MobileSheet>
      )}
    </>
  )
}
