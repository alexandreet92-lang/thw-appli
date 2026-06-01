'use client'
import { useEffect, useRef, useState } from 'react'

interface GpxPt { lat: number; lon: number; ele: number }
interface ElevPt { dist: number; ele: number }

function parseGpxFull(text: string): GpxPt[] {
  try {
    const doc = new DOMParser().parseFromString(text, 'text/xml')
    const nodes = Array.from(doc.querySelectorAll('trkpt,rtept,wpt'))
    const pts = nodes.map(n => ({
      lat: parseFloat(n.getAttribute('lat') ?? 'NaN'),
      lon: parseFloat(n.getAttribute('lon') ?? 'NaN'),
      ele: parseFloat(n.querySelector('ele')?.textContent ?? '0') || 0,
    })).filter(p => !isNaN(p.lat) && !isNaN(p.lon))
    if (pts.length > 500) {
      const step = Math.ceil(pts.length / 500)
      return pts.filter((_, i) => i % step === 0)
    }
    return pts
  } catch { return [] }
}

function hav(a: GpxPt, b: GpxPt): number {
  const R = 6371, toRad = Math.PI / 180
  const dLat = (b.lat - a.lat) * toRad, dLon = (b.lon - a.lon) * toRad
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * toRad) * Math.cos(b.lat * toRad) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s))
}

function buildProfile(pts: GpxPt[]): ElevPt[] {
  let dist = 0
  return pts.map((p, i) => { if (i > 0) dist += hav(pts[i - 1], p); return { dist, ele: p.ele } })
}

export default function GpxFullView({ fileUrl, height = 320 }: { fileUrl: string; height?: number }) {
  const mapDivRef = useRef<HTMLDivElement>(null)
  const syncRef   = useRef<((idx: number | null) => void) | null>(null)
  const [pts,      setPts]      = useState<GpxPt[]>([])
  const [profile,  setProfile]  = useState<ElevPt[]>([])
  const [status,   setStatus]   = useState<'loading' | 'ok' | 'error'>('loading')
  const [hoverIdx, setHoverIdx] = useState<number | null>(null)

  useEffect(() => {
    if (!mapDivRef.current) return
    let cancelled = false
    let leafMap: { remove: () => void } | null = null
    ;(async () => {
      try {
        const text = await fetch(fileUrl).then(r => r.text())
        if (cancelled) return
        const parsed = parseGpxFull(text)
        if (parsed.length < 2) { setStatus('error'); return }
        const prof = buildProfile(parsed)
        setPts(parsed)
        setProfile(prof)
        const L = (await import('leaflet')).default
        if (cancelled || !mapDivRef.current) return
        if (!document.getElementById('leaflet-css-gpx')) {
          const lk = document.createElement('link')
          lk.id = 'leaflet-css-gpx'; lk.rel = 'stylesheet'
          lk.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
          document.head.appendChild(lk)
        }
        const m = L.map(mapDivRef.current, { zoomControl: false, attributionControl: false, scrollWheelZoom: false })
        leafMap = m
        L.tileLayer(`https://api.mapbox.com/styles/v1/mapbox/outdoors-v12/tiles/512/{z}/{x}/{y}@2x?access_token=${process.env.NEXT_PUBLIC_MAPBOX ?? ''}`, { tileSize: 512, zoomOffset: -1, maxZoom: 20, attribution: '© <a href="https://www.mapbox.com/about/maps/">Mapbox</a> © <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>' }).addTo(m)
        const poly = L.polyline(parsed.map(p => [p.lat, p.lon] as [number, number]), { color: '#06B6D4', weight: 3, opacity: 0.9 }).addTo(m)
        m.fitBounds(poly.getBounds(), { padding: [10, 10] })
        const mk = L.circleMarker([parsed[0].lat, parsed[0].lon], { radius: 5, color: '#fff', fillColor: '#06B6D4', fillOpacity: 0, opacity: 0, weight: 2 }).addTo(m)
        syncRef.current = (idx) => {
          if (idx === null) { mk.setStyle({ fillOpacity: 0, opacity: 0 }); return }
          mk.setLatLng([parsed[idx].lat, parsed[idx].lon])
          mk.setStyle({ fillOpacity: 1, opacity: 1 })
        }
        setStatus('ok')
      } catch { if (!cancelled) setStatus('error') }
    })()
    return () => { cancelled = true; try { leafMap?.remove() } catch { /* ignore */ } }
  }, [fileUrl])

  useEffect(() => { syncRef.current?.(hoverIdx) }, [hoverIdx])

  const mapH   = Math.round(height * 0.65)
  const chartH = height - mapH
  const W = 500, H = chartH - 4
  const PL = 34, PR = 6, PT = 6, PB = 18
  const cW = W - PL - PR, cH = H - PT - PB

  const minE = profile.length ? Math.min(...profile.map(p => p.ele)) : 0
  const maxE = profile.length ? Math.max(...profile.map(p => p.ele)) : 100
  const totD = profile.length ? profile[profile.length - 1].dist : 1
  const eR = maxE - minE || 1

  const px = (d: number) => PL + (d / totD) * cW
  const py = (e: number) => PT + cH - ((e - minE) / eR) * cH

  const linePts = profile.map(p => `${px(p.dist)},${py(p.ele)}`).join(' ')
  const areaPts = profile.length ? `${px(0)},${py(minE)} ${linePts} ${px(totD)},${py(minE)}` : ''

  function onMouseMove(e: React.MouseEvent<SVGSVGElement>) {
    if (!profile.length) return
    const rect = e.currentTarget.getBoundingClientRect()
    const svgX  = ((e.clientX - rect.left) / rect.width) * W
    const dist  = Math.max(0, Math.min(totD, ((svgX - PL) / cW) * totD))
    let best = 0, bestDelta = Infinity
    profile.forEach((p, i) => { const d = Math.abs(p.dist - dist); if (d < bestDelta) { bestDelta = d; best = i } })
    setHoverIdx(best)
  }

  const hp = hoverIdx !== null ? profile[hoverIdx] : null
  // keep pts in deps but only used via syncRef — suppress unused warning
  void pts

  return (
    <div style={{ borderRadius: 10, overflow: 'hidden', border: '1px solid var(--border)' }}>
      <div style={{ position: 'relative', height: mapH, background: '#1a1a2e' }}>
        <div ref={mapDivRef} style={{ width: '100%', height: '100%' }} />
        {status === 'loading' && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)', fontSize: 11, color: '#9ca3af', pointerEvents: 'none' }}>
            Chargement carte…
          </div>
        )}
        {status === 'error' && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#1a1a2e', fontSize: 11, color: '#6b7280' }}>
            Tracé non disponible
          </div>
        )}
      </div>

      {status === 'ok' && profile.length > 0 && (
        <div style={{ background: '#111827', borderTop: '1px solid var(--border)', height: chartH }}>
          <svg
            width="100%" height={H} viewBox={`0 0 ${W} ${H}`}
            preserveAspectRatio="none"
            onMouseMove={onMouseMove}
            onMouseLeave={() => setHoverIdx(null)}
            style={{ cursor: 'crosshair', display: 'block' }}
          >
            <polygon points={areaPts} fill="rgba(6,182,212,0.12)" />
            <polyline points={linePts} fill="none" stroke="#06B6D4" strokeWidth="1.5" />

            {hp && (
              <>
                <line
                  x1={px(hp.dist)} y1={PT} x2={px(hp.dist)} y2={PT + cH}
                  stroke="rgba(255,255,255,0.35)" strokeWidth="1" strokeDasharray="3,3"
                />
                <circle cx={px(hp.dist)} cy={py(hp.ele)} r="3.5" fill="#06B6D4" stroke="#fff" strokeWidth="1.5" />
                <rect
                  x={Math.min(px(hp.dist) + 5, W - 64)} y={Math.max(py(hp.ele) - 18, PT)}
                  width={60} height={14} rx={3} fill="rgba(0,0,0,0.8)"
                />
                <text
                  x={Math.min(px(hp.dist) + 8, W - 61)} y={Math.max(py(hp.ele) - 7, PT + 10)}
                  fontSize="8" fill="#e5e7eb"
                >
                  {Math.round(hp.dist * 10) / 10}km · {Math.round(hp.ele)}m
                </text>
              </>
            )}

            <text x={PL - 2} y={PT + 8}   fontSize="8" fill="#6b7280" textAnchor="end">{Math.round(maxE)}m</text>
            <text x={PL - 2} y={PT + cH}  fontSize="8" fill="#6b7280" textAnchor="end">{Math.round(minE)}m</text>
            <text x={W - PR}  y={H - 3}    fontSize="8" fill="#6b7280" textAnchor="end">{Math.round(totD * 10) / 10}km</text>
          </svg>
        </div>
      )}
    </div>
  )
}
