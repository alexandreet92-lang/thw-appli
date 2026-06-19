'use client'
// ══════════════════════════════════════════════════════════════════
// ParcoursViewer — visualiseur de parcours réutilisable (Course + Stage).
// Rendu calqué sur la page Training : carte ActivityMapInner (mêmes tuiles +
// bascule Std/Sat/Hyb) + profil d'altitude SVG synchronisé (survol du profil
// → marqueur sur la carte) + KPIs (distance, D+, D−, alt min/max).
// Source : un fichier GPX local (File, aperçu immédiat) OU une URL stockée.
// Réutilise le parseur src/lib/gpxParser.ts.
// ══════════════════════════════════════════════════════════════════
import { useEffect, useMemo, useState } from 'react'
import dynamic from 'next/dynamic'
import { parseGPX } from '@/lib/gpxParser'

const MapInner = dynamic(() => import('@/components/activity/ActivityMapInner'), {
  ssr: false,
  loading: () => (
    <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', background:'#0F172A', color:'#64748B', fontSize:12 }}>
      Chargement de la carte…
    </div>
  ),
})

interface Parsed {
  points: { lat: number; lng: number }[]
  elev: { distanceM: number; altitudeM: number }[]
  distanceM: number
  gain: number
  loss: number
  altMin: number
  altMax: number
}

function analyse(gpxText: string): Parsed | null {
  const p = parseGPX(gpxText)
  if (p.waypoints.length < 2) return null
  let loss = 0
  for (let i = 1; i < p.elevationProfile.length; i++) {
    const d = p.elevationProfile[i].altitudeM - p.elevationProfile[i - 1].altitudeM
    if (d < 0) loss -= d
  }
  const alts = p.elevationProfile.map(e => e.altitudeM)
  return {
    points: p.waypoints.map(w => ({ lat: w.lat, lng: w.lng })),
    elev: p.elevationProfile,
    distanceM: p.distanceM,
    gain: p.elevGain,
    loss: Math.round(loss),
    altMin: alts.length ? Math.min(...alts) : 0,
    altMax: alts.length ? Math.max(...alts) : 0,
  }
}

export default function ParcoursViewer({ file, fileUrl, mapHeight = 230 }: {
  file?: File
  fileUrl?: string
  mapHeight?: number
}) {
  const [data, setData] = useState<Parsed | null>(null)
  const [status, setStatus] = useState<'loading' | 'ok' | 'error'>('loading')
  const [layer, setLayer] = useState<'std' | 'sat' | 'hyb'>('std')
  const [hoverIdx, setHoverIdx] = useState<number | null>(null)

  useEffect(() => {
    let cancelled = false
    setStatus('loading'); setData(null)
    ;(async () => {
      try {
        const text = file ? await file.text() : fileUrl ? await fetch(fileUrl).then(r => r.text()) : null
        if (!text) { if (!cancelled) setStatus('error'); return }
        const parsed = analyse(text)
        if (cancelled) return
        if (!parsed) { setStatus('error'); return }
        setData(parsed); setStatus('ok')
      } catch { if (!cancelled) setStatus('error') }
    })()
    return () => { cancelled = true }
  }, [file, fileUrl])

  // ── Profil SVG ──
  const W = 500, H = 120, PL = 34, PR = 8, PT = 10, PB = 18
  const cW = W - PL - PR, cH = H - PT - PB
  const prof = data?.elev ?? []
  const totD = data?.distanceM || 1
  const eMin = data?.altMin ?? 0, eMax = data?.altMax ?? 100
  const eR = eMax - eMin || 1
  const px = (d: number) => PL + (d / totD) * cW
  const py = (e: number) => PT + cH - ((e - eMin) / eR) * cH
  const linePts = useMemo(() => prof.map(p => `${px(p.distanceM)},${py(p.altitudeM)}`).join(' '), [prof])  // eslint-disable-line react-hooks/exhaustive-deps
  const areaPts = prof.length ? `${px(0)},${py(eMin)} ${linePts} ${px(totD)},${py(eMin)}` : ''
  const hp = hoverIdx !== null ? prof[hoverIdx] : null
  const hoverGps = hoverIdx !== null && data ? data.points[hoverIdx] ?? null : null

  function onMove(e: React.MouseEvent<SVGSVGElement>) {
    if (!prof.length) return
    const rect = e.currentTarget.getBoundingClientRect()
    const svgX = ((e.clientX - rect.left) / rect.width) * W
    const dist = Math.max(0, Math.min(totD, ((svgX - PL) / cW) * totD))
    let best = 0, bd = Infinity
    prof.forEach((p, i) => { const d = Math.abs(p.distanceM - dist); if (d < bd) { bd = d; best = i } })
    setHoverIdx(best)
  }

  if (status === 'error') {
    return <p style={{ fontSize:12, color:'#ef4444', margin:'8px 0 0' }}>Parcours illisible — fichier GPX invalide.</p>
  }
  if (status === 'loading' || !data) {
    return <div style={{ height: mapHeight, borderRadius:12, background:'#0F172A', display:'flex', alignItems:'center', justifyContent:'center', color:'#64748B', fontSize:12 }}>Lecture du parcours…</div>
  }

  const KPI = ({ label, value }: { label: string; value: string }) => (
    <div style={{ flex:1, minWidth:70 }}>
      <p style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em', color:'var(--text-dim)', margin:0 }}>{label}</p>
      <p style={{ fontSize:17, fontWeight:600, color:'var(--text)', margin:'2px 0 0', fontVariantNumeric:'tabular-nums' }}>{value}</p>
    </div>
  )

  return (
    <div style={{ borderRadius:12, overflow:'hidden', border:'1px solid var(--border)' }}>
      {/* KPIs */}
      <div style={{ display:'flex', gap:14, padding:'12px 14px', background:'var(--bg-card2)', flexWrap:'wrap' }}>
        <KPI label="Distance" value={`${(data.distanceM/1000).toFixed(1)} km`} />
        <KPI label="D+" value={`${Math.round(data.gain)} m`} />
        <KPI label="D−" value={`${data.loss} m`} />
        <KPI label="Alt." value={`${Math.round(data.altMin)}–${Math.round(data.altMax)} m`} />
      </div>

      {/* Carte (façon Training) */}
      <div style={{ position:'relative', width:'100%', height:mapHeight, background:'#0F172A' }}>
        <MapInner points={data.points} layer={layer} onLayerChange={setLayer} hoverGps={hoverGps} />
      </div>

      {/* Profil d'altitude synchronisé */}
      <div style={{ background:'#111827', borderTop:'1px solid var(--border)' }}>
        <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none"
          onMouseMove={onMove} onMouseLeave={() => setHoverIdx(null)}
          style={{ display:'block', cursor:'crosshair' }}>
          <polygon points={areaPts} fill="rgba(6,182,212,0.12)" />
          <polyline points={linePts} fill="none" stroke="#06B6D4" strokeWidth="1.5" />
          {hp && (
            <>
              <line x1={px(hp.distanceM)} y1={PT} x2={px(hp.distanceM)} y2={PT+cH} stroke="rgba(255,255,255,0.35)" strokeWidth="1" strokeDasharray="3,3" />
              <circle cx={px(hp.distanceM)} cy={py(hp.altitudeM)} r="3.5" fill="#06B6D4" stroke="#fff" strokeWidth="1.5" />
              <rect x={Math.min(px(hp.distanceM)+5, W-72)} y={Math.max(py(hp.altitudeM)-18, PT)} width={68} height={14} rx={3} fill="rgba(0,0,0,0.8)" />
              <text x={Math.min(px(hp.distanceM)+8, W-69)} y={Math.max(py(hp.altitudeM)-7, PT+10)} fontSize="8" fill="#e5e7eb">
                {(hp.distanceM/1000).toFixed(1)}km · {Math.round(hp.altitudeM)}m
              </text>
            </>
          )}
          <text x={PL-2} y={PT+8}  fontSize="8" fill="#6b7280" textAnchor="end">{Math.round(eMax)}m</text>
          <text x={PL-2} y={PT+cH} fontSize="8" fill="#6b7280" textAnchor="end">{Math.round(eMin)}m</text>
          <text x={W-PR}  y={H-4}   fontSize="8" fill="#6b7280" textAnchor="end">{(totD/1000).toFixed(1)}km</text>
        </svg>
      </div>
    </div>
  )
}
