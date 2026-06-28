'use client'
import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker, Polyline, CircleMarker, useMap } from 'react-leaflet'
import L from 'leaflet'

const PARIS: [number, number] = [48.8566, 2.3522]

const TOKEN = process.env.NEXT_PUBLIC_MAPBOX ?? ''
const ATTRIBUTION = '© <a href="https://www.mapbox.com/about/maps/">Mapbox</a> © <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'

const TILES = {
  std: {
    url: `https://api.mapbox.com/styles/v1/mapbox/outdoors-v12/tiles/512/{z}/{x}/{y}@2x?access_token=${TOKEN}`,
    overlay: null as string | null,
  },
  sat: {
    url: `https://api.mapbox.com/styles/v1/mapbox/satellite-streets-v12/tiles/512/{z}/{x}/{y}@2x?access_token=${TOKEN}`,
    overlay: null as string | null,
  },
  hyb: {
    url: `https://api.mapbox.com/styles/v1/mapbox/satellite-v9/tiles/512/{z}/{x}/{y}@2x?access_token=${TOKEN}`,
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
              borderRadius: '50%', cursor: 'pointer',
              // Repos : blanc le jour / noir la nuit (token --bg). Actif : accent.
              background: active ? 'var(--primary)' : 'var(--bg)',
              color: active ? 'var(--on-primary)' : 'var(--text)',
              border: active ? 'none' : '1px solid var(--border)',
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
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <MapContainer
        center={position ?? PARIS}
        zoom={15}
        zoomControl={false}
        attributionControl={false}
        style={{ width: '100%', height: '100%' }}
      >
        <TileLayer url={tile.url} tileSize={512} zoomOffset={-1} detectRetina={true} maxZoom={20} attribution={ATTRIBUTION} />
        {tile.overlay && <TileLayer url={tile.overlay} tileSize={512} zoomOffset={-1} detectRetina={true} maxZoom={20} attribution={ATTRIBUTION} />}
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
