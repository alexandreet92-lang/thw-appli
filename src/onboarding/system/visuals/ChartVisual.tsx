'use client'
import { useEffect, useRef } from 'react'
import { useI18n } from '@/lib/i18n'

interface Props { config: Record<string, unknown> }

const W = 320, H = 140
const pad = { l: 8, r: 8, t: 12, b: 20 }
const iw = W - pad.l - pad.r
const ih = H - pad.t - pad.b

function buildPath(pts: number[], flip = false): string {
  const mn = Math.min(...pts), mx = Math.max(...pts)
  const range = mx - mn || 1
  const xs = pts.map((_, i) => pad.l + (i / (pts.length - 1)) * iw)
  const ys = pts.map(v => pad.t + (flip ? ((v - mn) / range) : (1 - (v - mn) / range)) * ih)
  return xs.map((x, i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${ys[i].toFixed(1)}`).join(' ')
}

function AnimatedPath({ d, color, delay = 0, strokeWidth = 2 }: { d: string; color: string; delay?: number; strokeWidth?: number }) {
  const ref = useRef<SVGPathElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const len = el.getTotalLength()
    el.style.strokeDasharray = String(len)
    el.style.strokeDashoffset = String(len)
    el.style.transition = `stroke-dashoffset 1.5s ${delay}s ease`
    requestAnimationFrame(() => { el.style.strokeDashoffset = '0' })
  }, [delay])
  return <path ref={ref} d={d} fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
}

export function ChartVisual({ config }: Props) {
  const { t } = useI18n()
  const type = config.type as string
  const data = config.data as number[] | undefined
  const color = (config.color as string) ?? '#06B6D4'
  const labelKey = config.labelKey as string | undefined
  const label = labelKey ? t(labelKey) : (config.label as string | undefined)

  if (type === 'bar_chart') {
    const bars = data ?? []
    const colors = (config.colors as string[]) ?? []
    const mx = Math.max(...bars)
    const labels = (config.labels as string[]) ?? []
    return (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '16px 20px' }}>
        {label && <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</p>}
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 90 }}>
          {bars.map((v, i) => (
            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
              <div style={{
                width: '100%', background: colors[i] ?? color,
                borderRadius: 4, height: `${(v / mx) * 80}px`,
                minWidth: 18, opacity: 0,
                animation: `stagger-in 400ms ${i * 80}ms forwards`,
              }} />
              {labels[i] && <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)' }}>{labels[i]}</span>}
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (type === 'bar_with_target') {
    const bars = data ?? []
    const target = config.target as number
    const mx = Math.max(...bars, target) * 1.1
    return (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '16px 20px' }}>
        {label && <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</p>}
        <div style={{ width: '100%', height: 90, position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: '100%' }}>
            {bars.map((v, i) => (
              <div key={i} style={{
                flex: 1, background: color, borderRadius: 4,
                height: `${(v / mx) * 100}%`, minWidth: 14,
                opacity: 0, animation: `stagger-in 400ms ${i * 80}ms forwards`,
              }} />
            ))}
          </div>
          <div style={{
            position: 'absolute', bottom: `${(target / mx) * 100}%`, left: 0, right: 0,
            height: 1.5, background: '#EF4444',
            borderRadius: 1,
            boxShadow: '0 0 4px rgba(239,68,68,0.6)',
          }} />
        </div>
      </div>
    )
  }

  if (type === 'triple_line' || type === 'ctl_atl_tsb') {
    const d1 = (config.data_ctl ?? config.data1) as number[]
    const d2 = (config.data_atl ?? config.data2) as number[]
    const d3 = (config.data_tsb ?? config.data3) as number[]
    const c1 = (config.color1 as string) ?? '#10B981'
    const c2 = (config.color2 as string) ?? '#EF4444'
    const c3 = (config.color3 as string) ?? '#06B6D4'
    const l1 = (config.label1 as string) ?? 'CTL'
    const l2 = (config.label2 as string) ?? 'ATL'
    const l3 = (config.label3 as string) ?? 'TSB'
    const allPts = [...d1, ...d2, ...d3]
    const mn = Math.min(...allPts), mx = Math.max(...allPts)
    const range = mx - mn || 1
    const scaleY = (v: number) => pad.t + (1 - (v - mn) / range) * ih
    const mkPath = (pts: number[]) =>
      pts.map((v, i) => `${i === 0 ? 'M' : 'L'}${(pad.l + (i / (pts.length - 1)) * iw).toFixed(1)},${scaleY(v).toFixed(1)}`).join(' ')
    return (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 16, gap: 6 }}>
        <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ overflow: 'visible' }}>
          <AnimatedPath d={mkPath(d3)} color={c3} delay={0.2} strokeWidth={1.5} />
          <AnimatedPath d={mkPath(d1)} color={c1} delay={0} strokeWidth={2} />
          <AnimatedPath d={mkPath(d2)} color={c2} delay={0.1} strokeWidth={2} />
        </svg>
        <div style={{ display: 'flex', gap: 12 }}>
          {[{ c: c1, l: l1 }, { c: c2, l: l2 }, { c: c3, l: l3 }].map(({ c, l }) => (
            <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <div style={{ width: 10, height: 2, background: c, borderRadius: 1 }} />
              <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)' }}>{l}</span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (type === 'elevation_with_scrub') {
    const pts = data ?? []
    const scrubIdx = Math.floor(pts.length * 0.45)
    const area = buildPath(pts) + ` V${H - pad.b} L${pad.l},${H - pad.b} Z`
    const line = buildPath(pts)
    const mn = Math.min(...pts), mx = Math.max(...pts)
    const range = mx - mn || 1
    const xs = pts.map((_, i) => pad.l + (i / (pts.length - 1)) * iw)
    const ys = pts.map(v => pad.t + (1 - (v - mn) / range) * ih)
    return (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 16, gap: 4 }}>
        {label && <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</p>}
        <svg width="100%" viewBox={`0 0 ${W} ${H}`}>
          <defs>
            <linearGradient id="elev-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.3} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <path d={area} fill="url(#elev-grad)" />
          <AnimatedPath d={line} color={color} />
          <circle cx={xs[scrubIdx]} cy={ys[scrubIdx]} r={5} fill="#EF4444" stroke="white" strokeWidth={1.5} />
          <line x1={xs[scrubIdx]} y1={pad.t} x2={xs[scrubIdx]} y2={H - pad.b} stroke="rgba(255,255,255,0.3)" strokeWidth={1} strokeDasharray="3,2" />
        </svg>
      </div>
    )
  }

  // progression_line, weight_area — single animated line + area
  const area = buildPath(data ?? []) + ` V${H - pad.b} L${pad.l},${H - pad.b} Z`
  const line = buildPath(data ?? [])
  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 16, gap: 4 }}>
      {label && <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</p>}
      <svg width="100%" viewBox={`0 0 ${W} ${H}`}>
        <defs>
          <linearGradient id="cg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.3} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <path d={area} fill="url(#cg)" />
        <AnimatedPath d={line} color={color} />
      </svg>
    </div>
  )
}
