'use client'
import { useEffect, useRef, useState } from 'react'
import { parseGpxText } from './GpxRouteSvg'

interface Props {
  fileUrl: string
  height?: number
}

/** Interactive Leaflet map rendered from a remote GPX URL. */
export default function GpxRouteMap({ fileUrl, height = 220 }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [status, setStatus] = useState<'loading' | 'ok' | 'error'>('loading')

  useEffect(() => {
    if (!containerRef.current) return
    let map: { remove: () => void } | null = null
    let cancelled = false

    ;(async () => {
      try {
        const text = await fetch(fileUrl).then(r => r.text())
        if (cancelled) return
        const trace = parseGpxText(text)
        if (trace.length < 2) { setStatus('error'); return }

        const L = (await import('leaflet')).default
        if (cancelled) return

        if (!document.getElementById('leaflet-css-gpx')) {
          const link = document.createElement('link')
          link.id = 'leaflet-css-gpx'
          link.rel = 'stylesheet'
          link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
          document.head.appendChild(link)
        }

        if (!containerRef.current || cancelled) return
        const m = L.map(containerRef.current, {
          zoomControl: false, attributionControl: false,
          scrollWheelZoom: false,
        })
        map = m
        L.tileLayer(`https://api.mapbox.com/styles/v1/mapbox/outdoors-v12/tiles/512/{z}/{x}/{y}@2x?access_token=${process.env.NEXT_PUBLIC_MAPBOX ?? ''}`, { tileSize: 512, zoomOffset: -1, maxZoom: 20, attribution: '© <a href="https://www.mapbox.com/about/maps/">Mapbox</a> © <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>' }).addTo(m)
        const poly = L.polyline(
          trace.map(p => [p.lat, p.lon] as [number, number]),
          { color: '#00c8e0', weight: 3, opacity: 0.9 },
        ).addTo(m)
        m.fitBounds(poly.getBounds(), { padding: [10, 10] })
        setStatus('ok')
      } catch {
        if (!cancelled) setStatus('error')
      }
    })()

    return () => {
      cancelled = true
      try { map?.remove() } catch { /* ignore */ }
    }
  }, [fileUrl])

  return (
    <div style={{ position: 'relative', height, borderRadius: 8, overflow: 'hidden', background: '#1a1a2e' }}>
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
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
  )
}
