'use client'
// Carte de suivi (Leaflet) : marqueur qui suit la position transmise en direct.
import { useEffect, useRef } from 'react'
import { MapContainer, TileLayer, CircleMarker, useMap } from 'react-leaflet'

const TOKEN = process.env.NEXT_PUBLIC_MAPBOX ?? ''
const TILES = `https://api.mapbox.com/styles/v1/mapbox/outdoors-v12/tiles/512/{z}/{x}/{y}@2x?access_token=${TOKEN}`
const ATTR = '© Mapbox © OpenStreetMap'

function Recenter({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap()
  const first = useRef(true)
  useEffect(() => {
    if (first.current) { map.setView([lat, lng], 15); first.current = false }
    else map.panTo([lat, lng], { animate: true })
  }, [lat, lng, map])
  return null
}

export default function LiveMap({ lat, lng, active }: { lat: number; lng: number; active: boolean }) {
  const color = active ? '#06B6D4' : '#9CA3AF'
  return (
    <MapContainer center={[lat, lng]} zoom={15} zoomControl={false} attributionControl={false} style={{ width: '100%', height: '100%' }}>
      <TileLayer url={TILES} tileSize={512} zoomOffset={-1} detectRetina maxZoom={20} attribution={ATTR} />
      <CircleMarker center={[lat, lng]} radius={16} pathOptions={{ fillColor: color, fillOpacity: 0.2, color: 'transparent', weight: 0 }} />
      <CircleMarker center={[lat, lng]} radius={8} pathOptions={{ fillColor: color, fillOpacity: 1, color: '#fff', weight: 2.5 }} />
      <Recenter lat={lat} lng={lng} />
    </MapContainer>
  )
}
