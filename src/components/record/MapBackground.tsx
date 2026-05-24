'use client'
import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet'
import L from 'leaflet'

const PARIS: [number, number] = [48.8566, 2.3522]
const LIGHT_TILES = 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'
const DARK_TILES  = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'

/** Marker custom : cercle cyan + halo pulsant via divIcon. */
const gpsIcon = L.divIcon({
  className: 'record-gps-marker',
  html:
    '<div class="record-gps-halo"></div>' +
    '<div class="record-gps-dot"></div>',
  iconSize: [16, 16],
  iconAnchor: [8, 8],
})

function useIsDark(): boolean {
  const [dark, setDark] = useState<boolean>(false)
  useEffect(() => {
    const check = () => setDark(document.documentElement.classList.contains('dark'))
    check()
    const obs = new MutationObserver(check)
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => obs.disconnect()
  }, [])
  return dark
}

function FlyToPosition({ position }: { position: [number, number] | null }) {
  const map = useMap()
  useEffect(() => {
    if (position) map.setView(position, 15, { animate: true })
  }, [map, position])
  return null
}

interface Props {
  /** Optionnel — si présent, tracé du parcours en cyan. */
  trackPoints?: { lat: number; lng: number }[]
}

export default function MapBackground({ trackPoints }: Props) {
  const dark = useIsDark()
  const [position, setPosition] = useState<[number, number] | null>(null)

  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      (pos) => setPosition([pos.coords.latitude, pos.coords.longitude]),
      () => setPosition(null),
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
    )
  }, [])

  return (
    <MapContainer
      center={position ?? PARIS}
      zoom={15}
      zoomControl={false}
      attributionControl={false}
      style={{ width: '100%', height: '100%' }}
    >
      <TileLayer
        url={dark ? DARK_TILES : LIGHT_TILES}
        subdomains={['a', 'b', 'c', 'd']}
        maxZoom={19}
      />
      {position && <Marker position={position} icon={gpsIcon} />}
      <FlyToPosition position={position} />
      {trackPoints && trackPoints.length > 1 && (
        <TrackPolyline points={trackPoints} />
      )}
    </MapContainer>
  )
}

/** Polyline locale via Leaflet API directe (pas besoin de react-leaflet Polyline). */
function TrackPolyline({ points }: { points: { lat: number; lng: number }[] }) {
  const map = useMap()
  useEffect(() => {
    if (points.length < 2) return
    const latlngs = points.map(p => [p.lat, p.lng] as [number, number])
    const polyline = L.polyline(latlngs, { color: '#06B6D4', weight: 4, opacity: 0.85 })
    polyline.addTo(map)
    return () => { polyline.remove() }
  }, [map, points])
  return null
}
