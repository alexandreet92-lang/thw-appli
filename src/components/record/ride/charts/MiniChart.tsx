'use client'
// Mini-courbe de puissance (page Pilotage) : aire + trait sur les ~3 dernières
// minutes. Redessine chaque seconde (prop `t`) et au redimensionnement.
import { useCallback, useEffect, useRef } from 'react'
import { setupCanvas, readVar } from './useCanvas'
import type { RideSample } from '../types'

export default function MiniChart({ samples, ftp, t }: { samples: RideSample[]; ftp: number; t: number }) {
  const ref = useRef<HTMLCanvasElement>(null)

  const draw = useCallback(() => {
    const cv = ref.current; if (!cv) return
    const s = setupCanvas(cv); if (!s) return
    const { ctx, w, h } = s
    ctx.clearRect(0, 0, w, h)
    const a = samples.slice(-180)
    if (a.length < 2) return
    const mx = Math.max(ftp * 1.3, ...a.map(p => p.power ?? 0)) || 1
    const px = (i: number) => (i / (a.length - 1)) * w
    const py = (p: RideSample) => h - ((p.power ?? 0) / mx) * h * 0.92

    ctx.beginPath()
    a.forEach((p, i) => { const x = px(i), y = py(p); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y) })
    ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.closePath()
    const g = ctx.createLinearGradient(0, 0, 0, h)
    g.addColorStop(0, readVar('--ride-fill-a')); g.addColorStop(1, readVar('--ride-fill-b'))
    ctx.fillStyle = g; ctx.fill()

    ctx.beginPath()
    a.forEach((p, i) => { const x = px(i), y = py(p); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y) })
    ctx.strokeStyle = readVar('--ride-power'); ctx.lineWidth = 1.6; ctx.stroke()
  }, [samples, ftp])

  useEffect(() => { draw() }, [draw, t])
  useEffect(() => {
    const ro = new ResizeObserver(() => draw())
    if (ref.current) ro.observe(ref.current)
    return () => ro.disconnect()
  }, [draw])

  return <canvas ref={ref} style={{ width: '100%', height: '100%', display: 'block' }} />
}
