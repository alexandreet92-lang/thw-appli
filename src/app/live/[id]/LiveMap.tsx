'use client'
// Carte de suivi (Leaflet) : position transmise en direct + trace reconstituée
// pendant la consultation. Recentrage automatique, suspendu 20 s après un
// geste manuel ; « Recentrer » (recenterKey) relance le suivi.
import { useEffect, useMemo, useRef } from 'react'
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import './live.css'

const TOKEN = process.env.NEXT_PUBLIC_MAPBOX ?? ''
const TILES = `https://api.mapbox.com/styles/v1/mapbox/outdoors-v12/tiles/512/{z}/{x}/{y}@2x?access_token=${TOKEN}`
const ATTR = '© Mapbox © OpenStreetMap'
// Leaflet pose des attributs SVG : couleur littérale (= --primary).
const ACCENT = '#06B6D4' // design-allow-color
const CASING = '#FFFFFF' // design-allow-color — halo blanc du tracé
const PAUSE_MS = 20000

interface LL { lat: number; lng: number }

function Follow({ pos, recenterKey, padBottom, padTop }: { pos: LL; recenterKey: number; padBottom: number; padTop: number }) {
  const map = useMap()
  const first = useRef(true)
  const lastUser = useRef(0)
  const selfMove = useRef(false)
  useEffect(() => {
    const onUser = () => { if (!selfMove.current) lastUser.current = Date.now() }
    map.on('dragstart', onUser)
    map.on('zoomstart', onUser)
    return () => { map.off('dragstart', onUser); map.off('zoomstart', onUser) }
  }, [map])
  const center = (force: boolean, animate: boolean) => {
    if (!force && Date.now() - lastUser.current < PAUSE_MS) return
    const z = first.current ? 15 : Math.max(13, map.getZoom())
    // Position centrée dans la zone visible (entre l'en-tête et le panneau bas).
    const target = map.unproject(map.project([pos.lat, pos.lng], z).add([0, (padBottom - padTop) / 2]), z)
    selfMove.current = true
    map.setView(target, z, { animate })
    map.once('moveend', () => { selfMove.current = false })
    first.current = false
  }
  useEffect(() => { center(false, !first.current) }, [pos.lat, pos.lng, padBottom, padTop]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (recenterKey) { lastUser.current = 0; center(true, true) } }, [recenterKey]) // eslint-disable-line react-hooks/exhaustive-deps
  return null
}

export default function LiveMap({ pos, trail, active, recenterKey, padBottom, padTop }: {
  pos: LL; trail: LL[]; active: boolean; recenterKey: number; padBottom: number; padTop: number
}) {
  const icon = useMemo(() => L.divIcon({
    className: 'lt-marker-wrap',
    html: `<div class="lt-marker" data-ended="${active ? '0' : '1'}"><div class="lt-marker-halo"></div><div class="lt-marker-dot"></div></div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  }), [active])
  const line = trail.map(p => [p.lat, p.lng] as [number, number])
  return (
    <MapContainer center={[pos.lat, pos.lng]} zoom={15} zoomControl={false} attributionControl={false} style={{ position: 'absolute', inset: 0 }}>
      <TileLayer url={TILES} tileSize={512} zoomOffset={-1} detectRetina maxZoom={20} attribution={ATTR} />
      {line.length > 1 && (
        <>
          <Polyline positions={line} pathOptions={{ color: CASING, weight: 10, opacity: 0.85, lineCap: 'round', lineJoin: 'round' }} />
          <Polyline positions={line} pathOptions={{ color: ACCENT, weight: 5, opacity: 1, lineCap: 'round', lineJoin: 'round' }} />
        </>
      )}
      <Marker position={[pos.lat, pos.lng]} icon={icon} />
      <Follow pos={pos} recenterKey={recenterKey} padBottom={padBottom} padTop={padTop} />
    </MapContainer>
  )
}
