'use client'
// ── ActivityMapInner — rendu Leaflet côté client uniquement ──────────────────
// Chargé via dynamic() dans ActivityMapCard pour éviter le SSR.

import { useEffect } from 'react'
import { MapContainer, TileLayer, Polyline, CircleMarker, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'

const KEY         = process.env.NEXT_PUBLIC_MAPTILER_KEY ?? ''
const ATTRIBUTION = '<a href="https://www.maptiler.com/copyright/" target="_blank">MapTiler</a> | <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a>'
const TILES = {
  std: `https://api.maptiler.com/maps/outdoor-v2/256/{z}/{x}/{y}.png?key=${KEY}`,
  sat: `https://api.maptiler.com/tiles/satellite-v2/{z}/{x}/{y}.jpg?key=${KEY}`,
  hyb: `https://api.maptiler.com/maps/hybrid/256/{z}/{x}/{y}.jpg?key=${KEY}`,
}

interface LatLng { lat: number; lng: number }

function FitBounds({ points }: { points: LatLng[] }) {
  const map = useMap()
  useEffect(() => {
    if (points.length < 2) return
    const latlngs = points.map(p => [p.lat, p.lng] as [number, number])
    map.fitBounds(latlngs, { padding: [20, 20] })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return null
}

function LayerSelector({ layer, onChange }: {
  layer: keyof typeof TILES
  onChange: (l: keyof typeof TILES) => void
}) {
  const items: { id: keyof typeof TILES; label: string }[] = [
    { id: 'std', label: 'Std' },
    { id: 'sat', label: 'Sat' },
    { id: 'hyb', label: 'Hyb' },
  ]
  return (
    <div style={{ position: 'absolute', right: 8, bottom: 40, zIndex: 1000, display: 'flex', flexDirection: 'column', gap: 4 }}>
      {items.map(it => {
        const active = layer === it.id
        return (
          <button
            key={it.id}
            onClick={() => onChange(it.id)}
            style={{
              width: 36, height: 36, borderRadius: '50%', border: 'none', cursor: 'pointer',
              background: active ? '#ffffff' : 'rgba(0,0,0,0.55)',
              color: active ? '#0A0A0A' : '#ffffff',
              backdropFilter: 'blur(8px)',
              fontFamily: 'DM Sans, sans-serif',
              fontSize: 10, fontWeight: 700,
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
  points: LatLng[]
  layer: keyof typeof TILES
  onLayerChange: (l: keyof typeof TILES) => void
}

export default function ActivityMapInner({ points, layer, onLayerChange }: Props) {
  const positions = points.map(p => [p.lat, p.lng] as [number, number])
  const center: [number, number] = points.length
    ? [points[Math.floor(points.length / 2)].lat, points[Math.floor(points.length / 2)].lng]
    : [48.8566, 2.3522]

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <MapContainer
        center={center}
        zoom={13}
        zoomControl={false}
        attributionControl={false}
        style={{ width: '100%', height: '100%' }}
      >
        <TileLayer url={TILES[layer]} tileSize={256} maxZoom={19} attribution={ATTRIBUTION} />

        {points.length > 1 && (
          <>
            <Polyline
              positions={positions}
              pathOptions={{ color: '#06B6D4', weight: 3, opacity: 0.9 }}
            />
            {/* Départ — vert */}
            <CircleMarker
              center={positions[0]}
              radius={6}
              pathOptions={{ fillColor: '#10B981', fillOpacity: 1, color: 'white', weight: 2 }}
            />
            {/* Arrivée — rouge */}
            <CircleMarker
              center={positions[positions.length - 1]}
              radius={6}
              pathOptions={{ fillColor: '#EF4444', fillOpacity: 1, color: 'white', weight: 2 }}
            />
            <FitBounds points={points} />
          </>
        )}
      </MapContainer>
      <LayerSelector layer={layer} onChange={onLayerChange} />
    </div>
  )
}
