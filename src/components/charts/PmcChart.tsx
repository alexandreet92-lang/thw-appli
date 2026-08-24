'use client'
// PMC — Forme (CTL) / Fatigue (ATL) / Fraîcheur (TSB). UN SEUL axe (TSS) :
// panneau haut = CTL (aire) + ATL (ligne) ; sous-panneau = TSB rempli autour
// de zéro (vert au-dessus, rouge en-dessous). Crosshair + valeurs au survol.
import { useRef, useState } from 'react'
import { INK, LOAD, fmtDateShort, niceMax } from './theme'
import type { PmcPoint } from '@/lib/training/pmc'

export function PmcChart({ points, height = 240 }: { points: PmcPoint[]; height?: number }) {
  const ref = useRef<SVGSVGElement | null>(null)
  const [hi, setHi] = useState<number | null>(null)
  const W = 760, padL = 34, padR = 12, padT = 12
  const gapH = 10
  const mainH = height * 0.66, tsbH = height - mainH - gapH - 20
  if (points.length < 2) return <div style={{ fontSize: 12, color: INK.dim, padding: 16 }}>Pas assez de données pour la charge.</div>

  const n = points.length
  const x = (i: number) => padL + (i / (n - 1)) * (W - padL - padR)
  const ctlMax = niceMax(Math.max(...points.map(p => Math.max(p.ctl, p.atl)), 10))
  const yMain = (v: number) => padT + (1 - v / ctlMax) * (mainH - padT)
  const tsbAbs = Math.max(10, ...points.map(p => Math.abs(p.tsb)))
  const tsbTop = mainH + gapH
  const yTsb = (v: number) => tsbTop + (1 - (v + tsbAbs) / (2 * tsbAbs)) * tsbH

  const ctlArea = `M${x(0)},${yMain(0)} ` + points.map((p, i) => `L${x(i).toFixed(1)},${yMain(p.ctl).toFixed(1)}`).join(' ') + ` L${x(n - 1)},${yMain(0)} Z`
  const ctlLine = points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${yMain(p.ctl).toFixed(1)}`).join(' ')
  const atlLine = points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${yMain(p.atl).toFixed(1)}`).join(' ')
  // TSB : deux aires (positive / négative) coupées à zéro.
  const tsbPos = `M${x(0)},${yTsb(0)} ` + points.map((p, i) => `L${x(i).toFixed(1)},${yTsb(Math.max(0, p.tsb)).toFixed(1)}`).join(' ') + ` L${x(n - 1)},${yTsb(0)} Z`
  const tsbNeg = `M${x(0)},${yTsb(0)} ` + points.map((p, i) => `L${x(i).toFixed(1)},${yTsb(Math.min(0, p.tsb)).toFixed(1)}`).join(' ') + ` L${x(n - 1)},${yTsb(0)} Z`

  const ticks = 4
  const onMove = (e: React.PointerEvent) => {
    const r = ref.current?.getBoundingClientRect(); if (!r) return
    const rel = (e.clientX - r.left) / r.width * W
    const i = Math.max(0, Math.min(n - 1, Math.round(((rel - padL) / (W - padL - padR)) * (n - 1))))
    setHi(i)
  }
  const p = hi != null ? points[hi] : points[n - 1]

  return (
    <div>
      <div style={{ display: 'flex', gap: 16, marginBottom: 6, flexWrap: 'wrap' }}>
        <Leg c={LOAD.ctl} label="Forme (CTL)" v={Math.round(p.ctl)} />
        <Leg c={LOAD.atl} label="Fatigue (ATL)" v={Math.round(p.atl)} />
        <Leg c={p.tsb >= 0 ? LOAD.tsbPos : LOAD.tsbNeg} label="Fraîcheur (TSB)" v={(p.tsb > 0 ? '+' : '') + Math.round(p.tsb)} />
        <span style={{ marginLeft: 'auto', fontSize: 11, color: INK.dim }}>{fmtDateShort(p.date)}</span>
      </div>
      <svg ref={ref} viewBox={`0 0 ${W} ${height}`} width="100%" height={height} preserveAspectRatio="none"
        onPointerMove={onMove} onPointerLeave={() => setHi(null)} style={{ display: 'block', touchAction: 'none' }}>
        <defs>
          <linearGradient id="ctlF" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={LOAD.ctl} stopOpacity="0.26" /><stop offset="100%" stopColor={LOAD.ctl} stopOpacity="0.02" /></linearGradient>
        </defs>
        {/* grille panneau haut */}
        {Array.from({ length: ticks + 1 }, (_, k) => {
          const v = (ctlMax / ticks) * k
          return <g key={k}><line x1={padL} y1={yMain(v)} x2={W - padR} y2={yMain(v)} stroke={INK.grid} strokeWidth={1} /><text x={padL - 5} y={yMain(v) + 3} textAnchor="end" style={{ fontSize: 9, fill: INK.dim }}>{Math.round(v)}</text></g>
        })}
        <path d={ctlArea} fill="url(#ctlF)" />
        <path d={ctlLine} fill="none" stroke={LOAD.ctl} strokeWidth={2.4} strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        <path d={atlLine} fill="none" stroke={LOAD.atl} strokeWidth={2} strokeLinejoin="round" strokeDasharray="1 0" vectorEffect="non-scaling-stroke" />

        {/* sous-panneau TSB */}
        <line x1={padL} y1={yTsb(0)} x2={W - padR} y2={yTsb(0)} stroke={INK.grid} strokeWidth={1} />
        <path d={tsbPos} fill={LOAD.tsbPos} opacity={0.7} />
        <path d={tsbNeg} fill={LOAD.tsbNeg} opacity={0.7} />
        <text x={padL - 5} y={yTsb(0) + 3} textAnchor="end" style={{ fontSize: 9, fill: INK.dim }}>0</text>
        <text x={W - padR} y={tsbTop - 2} textAnchor="end" style={{ fontSize: 8.5, fill: INK.dim, fontWeight: 700, letterSpacing: '0.05em' }}>TSB</text>

        {/* axe X (dates) */}
        {[0, Math.floor(n / 2), n - 1].map(i => <text key={i} x={x(i)} y={height - 4} textAnchor={i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle'} style={{ fontSize: 9, fill: INK.dim }}>{fmtDateShort(points[i].date)}</text>)}

        {/* crosshair */}
        {hi != null && (
          <g pointerEvents="none">
            <line x1={x(hi)} y1={padT} x2={x(hi)} y2={mainH} stroke={INK.text} strokeWidth={1} opacity={0.25} />
            <circle cx={x(hi)} cy={yMain(p.ctl)} r={3.5} fill={LOAD.ctl} stroke={INK.surface} strokeWidth={1.5} />
            <circle cx={x(hi)} cy={yMain(p.atl)} r={3.5} fill={LOAD.atl} stroke={INK.surface} strokeWidth={1.5} />
          </g>
        )}
      </svg>
    </div>
  )
}
function Leg({ c, label, v }: { c: string; label: string; v: number | string }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11.5 }}>
      <span style={{ width: 12, height: 3, borderRadius: 2, background: c }} />
      <span style={{ color: INK.mid, fontWeight: 600 }}>{label}</span>
      <span className="tabular-nums" style={{ color: INK.text, fontWeight: 800 }}>{v}</span>
    </span>
  )
}
