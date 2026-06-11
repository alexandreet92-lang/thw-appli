'use client'

import { useMemo, useState, useEffect, useRef } from 'react'
import type { ActivityRow, PmcPoint } from './types'
import { buildPmc } from '@/lib/training/pmc'

const PERIODS = [{ label:'6 sem', days:42 },{ label:'12 sem', days:84 },{ label:'6 mois', days:180 }]

interface TooltipState { x: number; y: number; point: PmcPoint }

function buildPath(pts: PmcPoint[], key: 'ctl'|'atl'|'tsb', W: number, H: number, min: number, max: number): string {
  if (!pts.length) return ''
  const range = max - min || 1
  return pts.map((p, i) => {
    const x = (i / (pts.length - 1)) * W
    const y = H - ((p[key] - min) / range) * H
    return `${i===0?'M':'L'} ${x.toFixed(1)} ${y.toFixed(1)}`
  }).join(' ')
}

export default function PmcChart({ activities }: { activities: ActivityRow[] }) {
  const [period, setPeriod] = useState(1)
  const [tooltip, setTooltip] = useState<TooltipState | null>(null)
  const [animating, setAnimating] = useState(false)
  const svgRef = useRef<SVGSVGElement>(null)

  const pts = useMemo(() => buildPmc(activities, PERIODS[period].days), [activities, period])

  useEffect(() => { setAnimating(false); const id = setTimeout(() => setAnimating(true), 50); return () => clearTimeout(id) }, [period, pts])

  const W = 600, H = 120
  const allVals = pts.flatMap(p => [p.ctl, p.atl, p.tsb])
  const min = Math.min(...allVals, -10), max = Math.max(...allVals, 10)
  const range = max - min || 1
  const zero = H - ((0 - min) / range) * H

  const pathCTL = buildPath(pts, 'ctl', W, H, min, max)
  const pathATL = buildPath(pts, 'atl', W, H, min, max)
  const pathTSB = buildPath(pts, 'tsb', W, H, min, max)
  const totalLen = Math.ceil(W * 1.1)

  function handleMouseMove(e: React.MouseEvent<SVGSVGElement>) {
    const rect = e.currentTarget.getBoundingClientRect()
    const rx = e.clientX - rect.left
    const idx = Math.round((rx / rect.width) * (pts.length - 1))
    const p = pts[Math.max(0, Math.min(idx, pts.length-1))]
    if (p) setTooltip({ x: rx, y: e.clientY - rect.top, point: p })
  }

  const xTicks: number[] = []
  for (let i = 0; i < pts.length; i++) {
    if (i % Math.floor(pts.length / 5) === 0) xTicks.push(i)
  }

  return (
    <div style={{ background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:20,padding:'20px 20px 16px',boxShadow:'var(--shadow-card)' }}>
      <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12,flexWrap:'wrap' as const,gap:8 }}>
        <div>
          <p style={{ fontSize:10,fontWeight:700,textTransform:'uppercase' as const,letterSpacing:'0.1em',color:'var(--text-dim)',margin:0 }}>Performance</p>
          <h3 style={{ fontFamily:'Syne,sans-serif',fontSize:16,fontWeight:700,margin:'2px 0 0' }}>CTL · ATL · TSB</h3>
        </div>
        <div style={{ display:'flex',gap:4 }}>
          {PERIODS.map((p,i)=>(
            <button key={i} onClick={()=>setPeriod(i)} style={{ padding:'4px 10px',borderRadius:7,border:'1px solid',fontSize:10,cursor:'pointer',borderColor:period===i?'#3B8FD4':'var(--border)',background:period===i?'rgba(59,143,212,0.12)':'var(--bg-card)',color:period===i?'#3B8FD4':'var(--text-mid)',fontWeight:period===i?600:400 }}>{p.label}</button>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div style={{ display:'flex',gap:16,marginBottom:10 }}>
        {[{c:'#3B8FD4',l:'CTL (Forme)'},{c:'#ef4444',l:'ATL (Fatigue)'},{c:'#10B981',l:'TSB (Fraîcheur)'}].map(x=>(
          <div key={x.l} style={{ display:'flex',alignItems:'center',gap:5 }}>
            <div style={{ width:16,height:2,background:x.c,borderRadius:1 }} />
            <span style={{ fontSize:10,color:'var(--text-dim)' }}>{x.l}</span>
          </div>
        ))}
      </div>

      <div style={{ overflowX:'auto' as const,position:'relative' as const }}>
        <svg ref={svgRef} viewBox={`0 0 ${W} ${H+24}`} style={{ width:'100%',minWidth:300,height:'auto',cursor:'crosshair',display:'block' }}
          onMouseMove={handleMouseMove} onMouseLeave={()=>setTooltip(null)}>
          {/* TSB fill */}
          <clipPath id="pmc-above"><rect x={0} y={0} width={W} height={zero} /></clipPath>
          <clipPath id="pmc-below"><rect x={0} y={zero} width={W} height={H-zero} /></clipPath>
          <path d={`${pathTSB} L ${W} ${H} L 0 ${H} Z`} fill="rgba(16,185,129,0.12)" clipPath="url(#pmc-above)" />
          <path d={`${pathTSB} L ${W} ${H} L 0 ${H} Z`} fill="rgba(239,68,68,0.12)" clipPath="url(#pmc-below)" />
          {/* Zero line */}
          <line x1={0} y1={zero} x2={W} y2={zero} stroke="var(--border)" strokeDasharray="4 4" strokeWidth={1} />
          {/* Curves */}
          {animating && <>
            <path d={pathCTL} fill="none" stroke="#3B8FD4" strokeWidth={2} strokeLinecap="round" strokeDasharray={totalLen} strokeDashoffset={0} style={{ animation:'pmcDraw 1.5s ease-out' }} />
            <path d={pathATL} fill="none" stroke="#ef4444" strokeWidth={2} strokeLinecap="round" strokeDasharray={totalLen} strokeDashoffset={0} style={{ animation:'pmcDraw 1.5s ease-out 0.2s both' }} />
            <path d={pathTSB} fill="none" stroke="#10B981" strokeWidth={1.5} strokeLinecap="round" strokeDasharray={totalLen} strokeDashoffset={0} style={{ animation:'pmcDraw 1.5s ease-out 0.4s both' }} />
          </>}
          {/* X axis labels */}
          {xTicks.map(i=>(
            <text key={i} x={(i/(pts.length-1))*W} y={H+18} fill="var(--text-dim)" fontSize={9} textAnchor="middle">
              {pts[i]?.date.slice(5)}
            </text>
          ))}
          {/* Hover point */}
          {tooltip && (() => {
            const i = Math.round((tooltip.x / 600) * (pts.length-1))
            const p = pts[Math.max(0,Math.min(i,pts.length-1))]
            if (!p) return null
            const x = (i/(pts.length-1))*W
            const yC = H - ((p.ctl-min)/range)*H
            return <circle cx={x} cy={yC} r={4} fill="#3B8FD4" />
          })()}
        </svg>
        {tooltip && (
          <div style={{ position:'absolute' as const,left:Math.min(tooltip.x+8,W-140),top:Math.max(tooltip.y-60,0),background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:9,padding:'7px 10px',fontSize:11,pointerEvents:'none' as const,boxShadow:'0 4px 12px rgba(0,0,0,0.2)',zIndex:10,minWidth:130 }}>
            <p style={{ margin:'0 0 3px',fontWeight:600 }}>{tooltip.point.date}</p>
            <p style={{ margin:'1px 0',color:'#3B8FD4' }}>CTL: {tooltip.point.ctl.toFixed(1)}</p>
            <p style={{ margin:'1px 0',color:'#ef4444' }}>ATL: {tooltip.point.atl.toFixed(1)}</p>
            <p style={{ margin:'1px 0',color:'#10B981' }}>TSB: {tooltip.point.tsb.toFixed(1)}</p>
          </div>
        )}
      </div>
      <style>{`@keyframes pmcDraw { from { stroke-dashoffset: ${totalLen}px; } to { stroke-dashoffset: 0; } }`}</style>
      {pts.length < 14 && (
        <p style={{ fontSize:10,color:'var(--text-dim)',textAlign:'center' as const,margin:'8px 0 0',fontStyle:'italic' }}>
          Plus de données d'entraînement = courbe plus fiable
        </p>
      )}
    </div>
  )
}
