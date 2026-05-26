'use client'
import { useEffect, useRef } from 'react'
import type { GPSPoint } from '@/hooks/useGPSTracking'

interface Props {
  points: GPSPoint[]
  isDark?: boolean
}

export default function SessionTraceMap({ points, isDark = false }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<unknown>(null)

  useEffect(() => {
    if (!containerRef.current || typeof window === 'undefined') return
    if (points.length < 2) return

    let map: ReturnType<typeof import('leaflet')['map']> | null = null

    import('leaflet').then((L) => {
      if (!containerRef.current) return
      if (mapRef.current) return

      const latlngs = points.map(p => [p.lat, p.lng] as [number, number])

      map = L.map(containerRef.current, {
        zoomControl: false,
        attributionControl: false,
        dragging: false,
        keyboard: false,
        scrollWheelZoom: false,
        doubleClickZoom: false,
        touchZoom: false,
        boxZoom: false,
      })
      mapRef.current = map

      const key = process.env.NEXT_PUBLIC_MAPTILER_KEY ?? ''
      L.tileLayer(
        `https://api.maptiler.com/maps/outdoor-v2/{z}/{x}/{y}.png?key=${key}`,
        { maxZoom: 20, maxNativeZoom: 18, tileSize: 512, zoomOffset: -1, attribution: '<a href="https://www.maptiler.com/copyright/" target="_blank">MapTiler</a> | <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a>' }
      ).addTo(map)

      const polyline = L.polyline(latlngs, { color: '#06B6D4', weight: 3, opacity: 0.9 })
      polyline.addTo(map)
      map.fitBounds(polyline.getBounds(), { padding: [16, 16] })

      const startIcon = L.divIcon({ className: '', html: '<div style="width:12px;height:12px;border-radius:50%;background:#10B981;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,0.3)"></div>', iconSize: [12, 12], iconAnchor: [6, 6] })
      const endIcon   = L.divIcon({ className: '', html: '<div style="width:12px;height:12px;border-radius:50%;background:#EF4444;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,0.3)"></div>', iconSize: [12, 12], iconAnchor: [6, 6] })
      L.marker(latlngs[0], { icon: startIcon }).addTo(map)
      L.marker(latlngs[latlngs.length - 1], { icon: endIcon }).addTo(map)
    })

    return () => {
      if (map) { map.remove(); mapRef.current = null }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (points.length < 2) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', background: isDark ? '#111' : '#f0f0f0' }}>
        <span style={{ fontSize: 12, color: isDark ? 'rgba(255,255,255,0.3)' : '#aaa' }}>Pas de tracé GPS</span>
      </div>
    )
  }

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
}
