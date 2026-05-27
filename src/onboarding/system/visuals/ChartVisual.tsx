'use client'
import { useEffect, useRef } from 'react'

interface Props { config: Record<string, unknown> }

export function ChartVisual({ config }: Props) {
  const type = config.type as string
  const data = config.data as number[]
  const color = (config.color as string) ?? '#06B6D4'
  const color1 = (config.color1 as string) ?? '#10B981'
  const color2 = (config.color2 as string) ?? '#EF4444'
  const label = config.label as string
  const pathRef = useRef<SVGPathElement>(null)

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

  useEffect(() => {
    const el = pathRef.current
    if (!el) return
    const len = el.getTotalLength()
    el.style.strokeDasharray = String(len)
    el.style.strokeDashoffset = String(len)
    el.style.transition = 'stroke-dashoffset 1.5s ease'
    requestAnimationFrame(() => { el.style.strokeDashoffset = '0' })
  }, [type])

  if (type === 'bar_chart') {
    const bars = data ?? []
    const mx = Math.max(...bars)
    return (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '16px 20px' }}>
        {label && <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</p>}
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 100 }}>
          {bars.map((v, i) => (
            <div key={i} style={{ flex: 1, background: color, borderRadius: 4, height: `${(v / mx) * 100}%`, opacity: 0, animation: `stagger-in 400ms ${i * 80}ms forwards`, minWidth: 18 }} />
          ))}
        </div>
      </div>
    )
  }

  if (type === 'dual_line') {
    const d1 = config.data1 as number[]
    const d2 = config.data2 as number[]
    return (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
        {label && <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</p>}
        <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ overflow: 'visible' }}>
          <path d={buildPath(d1)} fill="none" stroke={color1} strokeWidth={2} ref={pathRef} />
          <path d={buildPath(d2)} fill="none" stroke={color2} strokeWidth={2} style={{ strokeDasharray: 9999, strokeDashoffset: 9999, transition: 'stroke-dashoffset 1.5s 0.3s ease' }} ref={el => { if (el) { const len = el.getTotalLength(); el.style.strokeDasharray = String(len); el.style.strokeDashoffset = String(len); requestAnimationFrame(() => { el.style.strokeDashoffset = '0' }) } }} />
        </svg>
        <div style={{ display: 'flex', gap: 16 }}>
          {[{ c: color1, l: config.label1 as string }, { c: color2, l: config.label2 as string }].map(({ c, l }) => (
            <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <div style={{ width: 10, height: 2, background: c, borderRadius: 1 }} />
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>{l}</span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // elevation / area / pr_timeline — single line
  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      {label && <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</p>}
      <svg width="100%" viewBox={`0 0 ${W} ${H}`}>
        <defs>
          <linearGradient id="cg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.3} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <path d={buildPath(data ?? []) + ` V${H - pad.b} L${pad.l},${H - pad.b} Z`} fill="url(#cg)" />
        <path ref={pathRef} d={buildPath(data ?? [])} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" />
      </svg>
    </div>
  )
}
