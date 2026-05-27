'use client'
import { useEffect, useRef, useState } from 'react'
import { MapContainer, TileLayer, Marker, Polyline, CircleMarker, useMap } from 'react-leaflet'
import L from 'leaflet'

const PARIS: [number, number] = [48.8566, 2.3522]

const KEY = process.env.NEXT_PUBLIC_MAPTILER_KEY ?? ''
const ATTRIBUTION = '<a href="https://www.maptiler.com/copyright/" target="_blank">MapTiler</a> | <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a>'

const TILES = {
  std: {
    url: `https://api.maptiler.com/maps/outdoor-v2/256/{z}/{x}/{y}.png?key=${KEY}`,
    overlay: null as string | null,
  },
  sat: {
    url: `https://api.maptiler.com/tiles/satellite-v2/{z}/{x}/{y}.jpg?key=${KEY}`,
    overlay: null as string | null,
  },
  hyb: {
    url: `https://api.maptiler.com/maps/hybrid/256/{z}/{x}/{y}.jpg?key=${KEY}`,
    overlay: null as string | null,
  },
}
type LayerId = keyof typeof TILES

const gpsIcon = L.divIcon({
  className: 'record-gps-marker',
  html:
    '<div class="record-gps-halo"></div>' +
    '<div class="record-gps-dot"></div>',
  iconSize: [16, 16],
  iconAnchor: [8, 8],
})

function FlyToPosition({ position }: { position: [number, number] | null }) {
  const map = useMap()
  useEffect(() => {
    if (position) map.setView(position, 15, { animate: true })
  }, [map, position])
  return null
}

interface ActiveRoute {
  snapped_points: { lat: number; lng: number }[]
  elevation_profile: { distanceM: number; altitudeM: number }[]
}

function FitBounds({ activeRoute }: { activeRoute: ActiveRoute | null | undefined }) {
  const map = useMap()
  useEffect(() => {
    if (!activeRoute || activeRoute.snapped_points.length < 2) return
    const bounds = activeRoute.snapped_points.map(p => [p.lat, p.lng] as [number, number])
    map.fitBounds(bounds, { padding: [40, 40] })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeRoute])
  return null
}

function TrackPolyline({ points }: { points: { lat: number; lng: number }[] }) {
  const map = useMap()
  useEffect(() => {
    if (points.length < 2) return
    const latlngs = points.map(p => [p.lat, p.lng] as [number, number])
    const polyline = L.polyline(latlngs, { color: '#2563EB', weight: 4, opacity: 0.9 })
    polyline.addTo(map)
    return () => { polyline.remove() }
  }, [map, points])
  return null
}

function LayerSelector({ layer, onChange }: {
  layer: LayerId; onChange: (l: LayerId) => void
}) {
  const items: { id: LayerId; label: string }[] = [
    { id: 'std', label: 'Std' },
    { id: 'sat', label: 'Sat' },
    { id: 'hyb', label: 'Hyb' },
  ]
  return (
    <div style={{
      position: 'absolute',
      right: 12,
      bottom: 140,
      zIndex: 1000,
      display: 'flex', flexDirection: 'column', gap: 6,
    }}>
      {items.map(it => {
        const active = layer === it.id
        return (
          <button
            key={it.id}
            onClick={() => onChange(it.id)}
            style={{
              width: 42, height: 42,
              borderRadius: '50%', border: 'none', cursor: 'pointer',
              background: active ? '#ffffff' : 'rgba(0,0,0,0.50)',
              color: active ? '#0A0A0A' : '#ffffff',
              backdropFilter: 'blur(8px)',
              fontFamily: 'DM Sans, sans-serif',
              fontSize: 11, fontWeight: 700, letterSpacing: '0.04em',
              boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
            }}
          >
            {it.label}
          </button>
        )
      })}
    </div>
  )
}

interface Props {
  trackPoints?: { lat: number; lng: number }[]
  currentPosition?: [number, number] | null
  activeRoute?: ActiveRoute | null
}

export default function MapBackground({ trackPoints, currentPosition, activeRoute }: Props) {
  const [internalPosition, setInternalPosition] = useState<[number, number] | null>(null)
  const [layer, setLayer] = useState<LayerId>('std')
  const mapWrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = mapWrapRef.current
    if (!el) return
    const stop = (e: TouchEvent) => e.stopPropagation()
    el.addEventListener('touchstart', stop, { passive: true })
    el.addEventListener('touchmove',  stop, { passive: true })
    el.addEventListener('touchend',   stop, { passive: true })
    return () => {
      el.removeEventListener('touchstart', stop)
      el.removeEventListener('touchmove',  stop)
      el.removeEventListener('touchend',   stop)
    }
  }, [])

  useEffect(() => {
    if (currentPosition != null) return
    if (typeof navigator === 'undefined' || !navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      (pos) => setInternalPosition([pos.coords.latitude, pos.coords.longitude]),
      () => setInternalPosition(null),
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
    )
  }, [currentPosition])

  const position: [number, number] | null = currentPosition ?? internalPosition
  const tile = TILES[layer]

  return (
    <div ref={mapWrapRef} style={{ position: 'relative', width: '100%', height: '100%' }}>
      <MapContainer
        center={position ?? PARIS}
        zoom={15}
        zoomControl={false}
        attributionControl={false}
        style={{ width: '100%', height: '100%' }}
      >
        <TileLayer url={tile.url} tileSize={256} maxZoom={19} attribution={ATTRIBUTION} />
        {tile.overlay && <TileLayer url={tile.overlay} tileSize={256} maxZoom={19} attribution={ATTRIBUTION} />}
        {position && <Marker position={position} icon={gpsIcon} />}
        <FlyToPosition position={position} />
        {trackPoints && trackPoints.length > 1 && <TrackPolyline points={trackPoints} />}
        {activeRoute && activeRoute.snapped_points.length > 1 && (
          <>
            <Polyline
              positions={activeRoute.snapped_points.map(p => [p.lat, p.lng] as [number, number])}
              pathOptions={{ color: '#06B6D4', weight: 3, opacity: 0.8 }}
            />
            <CircleMarker
              center={[activeRoute.snapped_points[0].lat, activeRoute.snapped_points[0].lng]}
              radius={6}
              pathOptions={{ fillColor: '#10B981', fillOpacity: 1, color: 'white', weight: 2 }}
            />
            <CircleMarker
              center={[activeRoute.snapped_points[activeRoute.snapped_points.length - 1].lat, activeRoute.snapped_points[activeRoute.snapped_points.length - 1].lng]}
              radius={6}
              pathOptions={{ fillColor: '#EF4444', fillOpacity: 1, color: 'white', weight: 2 }}
            />
            <FitBounds activeRoute={activeRoute} />
          </>
        )}
      </MapContainer>
      <LayerSelector layer={layer} onChange={setLayer} />
    </div>
  )
}
