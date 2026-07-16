'use client'
// Courbe live puissance + cardio sur une fenêtre glissante (5 min mobile, 10 min
// desktop). Grille, ligne FTP en pointillés. Toutes les couleurs = tokens (sinon
// invisibles en thème clair).
import { useCallback, useEffect, useRef } from 'react'
import { setupCanvas, readVar } from './useCanvas'
import type { RideSample } from '../types'

interface Props { samples: RideSample[]; ftp: number; fcMax: number; windowS: number; t: number }

export default function LiveChart({ samples, ftp, fcMax, windowS, t }: Props) {
  const ref = useRef<HTMLCanvasElement>(null)

  const draw = useCallback(() => {
    const cv = ref.current; if (!cv) return
    const s = setupCanvas(cv); if (!s) return
    const { ctx, w, h } = s
    ctx.clearRect(0, 0, w, h)
    const a = samples.slice(-windowS)
    if (a.length < 2) return
    const pad = 6, H = h - pad * 2
    const pmax = Math.max(ftp * 1.35, ...a.map(p => p.power ?? 0)) || 1
    const hmin = 80, hmax = Math.max(hmin + 1, fcMax)
    const px = (i: number) => (i / (a.length - 1)) * w

    ctx.strokeStyle = readVar('--ride-grid'); ctx.lineWidth = 1
    for (let i = 1; i < 4; i++) { const y = pad + (H * i) / 4; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke() }

    const yF = pad + H - (ftp / pmax) * H
    ctx.setLineDash([4, 4]); ctx.strokeStyle = readVar('--ride-axis')
    ctx.beginPath(); ctx.moveTo(0, yF); ctx.lineTo(w, yF); ctx.stroke(); ctx.setLineDash([])
    ctx.fillStyle = readVar('--ride-axis-ink'); ctx.font = '700 9px system-ui'; ctx.fillText('FTP', 4, yF - 4)

    const pyP = (p: RideSample) => pad + H - ((p.power ?? 0) / pmax) * H
    ctx.beginPath()
    a.forEach((p, i) => { const x = px(i), y = pyP(p); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y) })
    ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.closePath()
    const g = ctx.createLinearGradient(0, 0, 0, h)
    g.addColorStop(0, readVar('--ride-fill-a')); g.addColorStop(1, readVar('--ride-fill-b'))
    ctx.fillStyle = g; ctx.fill()

    ctx.beginPath()
    a.forEach((p, i) => { const x = px(i), y = pyP(p); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y) })
    ctx.strokeStyle = readVar('--ride-power'); ctx.lineWidth = 1.8; ctx.stroke()

    // Cardio : on ne relie que les points disponibles (0 = capteur absent).
    ctx.beginPath(); let started = false
    a.forEach((p, i) => {
      if (!p.hr) { started = false; return }
      const x = px(i), y = pad + H - ((p.hr - hmin) / (hmax - hmin)) * H
      if (started) ctx.lineTo(x, y); else { ctx.moveTo(x, y); started = true }
    })
    ctx.strokeStyle = readVar('--ride-hr'); ctx.lineWidth = 1.8; ctx.stroke()
  }, [samples, ftp, fcMax, windowS])

  useEffect(() => { draw() }, [draw, t])
  useEffect(() => {
    const ro = new ResizeObserver(() => draw())
    if (ref.current) ro.observe(ref.current)
    return () => ro.disconnect()
  }, [draw])

  return <canvas ref={ref} style={{ width: '100%', height: '100%', display: 'block' }} />
}
