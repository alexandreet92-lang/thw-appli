'use client'
// Profil de séance : barres cibles par zone (depuis le plan) + trace réelle
// superposée + curseur de position. Si pas de plan (sortie libre), n'affiche que
// la trace réelle mise à l'échelle sur le temps écoulé.
import { useCallback, useEffect, useRef } from 'react'
import { setupCanvas, readVar } from './useCanvas'
import { zoneIndex } from '../zones'
import type { RidePlan, RideSample } from '../types'

interface Props { plan: RidePlan | null; samples: RideSample[]; ftp: number; t: number }

export default function ProfileChart({ plan, samples, ftp, t }: Props) {
  const ref = useRef<HTMLCanvasElement>(null)

  const draw = useCallback(() => {
    const cv = ref.current; if (!cv) return
    const s = setupCanvas(cv); if (!s) return
    const { ctx, w, h } = s
    ctx.clearRect(0, 0, w, h)
    const pad = 4, H = h - pad * 2
    const total = plan ? plan.totalS : Math.max(1, samples.length)
    const pmax = ftp * 1.35 || 1

    if (plan) {
      for (const b of plan.blocks) {
        const x0 = (b.t0 / total) * w, x1 = (b.t1 / total) * w
        const bh = (b.targetW / pmax) * H
        const zc = readVar(`--zone-${zoneIndex(b.targetW, ftp) + 1}`)
        ctx.fillStyle = zc + '55'
        ctx.fillRect(x0, pad + H - bh, Math.max(1, x1 - x0 - 1), bh)
        ctx.fillStyle = zc
        ctx.fillRect(x0, pad + H - bh, Math.max(1, x1 - x0 - 1), 2)
      }
    }

    if (samples.length > 1) {
      ctx.beginPath()
      samples.forEach((p, i) => {
        const x = (p.t / total) * w, y = pad + H - ((p.power ?? 0) / pmax) * H
        i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)
      })
      ctx.strokeStyle = readVar('--ride-trace'); ctx.lineWidth = 1; ctx.stroke()
    }

    const cx = (t / total) * w
    ctx.strokeStyle = readVar('--ride-power'); ctx.lineWidth = 2
    ctx.beginPath(); ctx.moveTo(cx, 0); ctx.lineTo(cx, h); ctx.stroke()
    ctx.fillStyle = readVar('--ride-power'); ctx.beginPath(); ctx.arc(cx, 4, 3.5, 0, Math.PI * 2); ctx.fill()
  }, [plan, samples, ftp, t])

  useEffect(() => { draw() }, [draw])
  useEffect(() => {
    const ro = new ResizeObserver(() => draw())
    if (ref.current) ro.observe(ref.current)
    return () => ro.disconnect()
  }, [draw])

  return <canvas ref={ref} style={{ width: '100%', height: '100%', display: 'block' }} />
}
