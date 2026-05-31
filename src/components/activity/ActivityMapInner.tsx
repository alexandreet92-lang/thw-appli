'use client'
// ── ActivityMapInner — rendu Leaflet côté client uniquement ──────────────────
// Chargé via dynamic() dans ActivityMapCard pour éviter le SSR.

import { useEffect } from 'react'
import { MapContainer, TileLayer, Polyline, CircleMarker, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'

const TOKEN       = process.env.NEXT_PUBLIC_MAPBOX ?? ''
const ATTRIBUTION = '© <a href="https://www.mapbox.com/about/maps/">Mapbox</a> © <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
const TILES = {
  std: `https://api.mapbox.com/styles/v1/mapbox/outdoors-v12/tiles/512/{z}/{x}/{y}@2x?access_token=${TOKEN}`,
  sat: `https://api.mapbox.com/styles/v1/mapbox/satellite-streets-v12/tiles/512/{z}/{x}/{y}@2x?access_token=${TOKEN}`,
  hyb: `https://api.mapbox.com/styles/v1/mapbox/satellite-v9/tiles/512/{z}/{x}/{y}@2x?access_token=${TOKEN}`,
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
  hoverGps?: { lat: number; lng: number } | null
}

export default function ActivityMapInner({ points, layer, onLayerChange, hoverGps }: Props) {
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
        <TileLayer url={TILES[layer]} tileSize={512} zoomOffset={-1} detectRetina={true} maxZoom={20} attribution={ATTRIBUTION} />

        {points.length > 1 && (
          <>
            {/* Contour blanc — effet "pop" Strava */}
            <Polyline
              positions={positions}
              pathOptions={{ color: 'white', weight: 7, opacity: 0.6, lineCap: 'round', lineJoin: 'round' }}
            />
            {/* Tracé principal cyan */}
            <Polyline
              positions={positions}
              pathOptions={{ color: '#06B6D4', weight: 4, opacity: 1, lineCap: 'round', lineJoin: 'round' }}
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
        {/* Point curseur — suit la position du doigt/souris sur les courbes (blanc = distinct de l'arrivée rouge) */}
        {hoverGps && (
          <CircleMarker
            center={[hoverGps.lat, hoverGps.lng]}
            radius={8}
            pathOptions={{ fillColor: '#ffffff', fillOpacity: 1, color: '#0f172a', weight: 2.5 }}
          />
        )}
      </MapContainer>
      <LayerSelector layer={layer} onChange={onLayerChange} />
    </div>
  )
}
