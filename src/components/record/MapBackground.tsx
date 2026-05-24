'use client'
import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet'
import L from 'leaflet'

const PARIS: [number, number] = [48.8566, 2.3522]

const TILES = {
  std: {
    url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    sub: ['a', 'b', 'c', 'd'] as string[],
    overlay: null as string | null,
  },
  sat: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    sub: undefined as string[] | undefined,
    overlay: null as string | null,
  },
  hyb: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    sub: undefined as string[] | undefined,
    overlay: 'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
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
}

export default function MapBackground({ trackPoints }: Props) {
  const [position, setPosition] = useState<[number, number] | null>(null)
  const [layer, setLayer] = useState<LayerId>('std')

  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      (pos) => setPosition([pos.coords.latitude, pos.coords.longitude]),
      () => setPosition(null),
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
    )
  }, [])

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
        <TileLayer url={tile.url} subdomains={tile.sub} maxZoom={19} />
        {tile.overlay && <TileLayer url={tile.overlay} maxZoom={19} opacity={1} />}
        {position && <Marker position={position} icon={gpsIcon} />}
        <FlyToPosition position={position} />
        {trackPoints && trackPoints.length > 1 && <TrackPolyline points={trackPoints} />}
      </MapContainer>
      <LayerSelector layer={layer} onChange={setLayer} />
    </div>
  )
}
