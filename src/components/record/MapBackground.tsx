'use client'
import { useEffect, useRef, useState } from 'react'
import { MapContainer, TileLayer, Marker, Polyline, CircleMarker, useMap } from 'react-leaflet'
import L from 'leaflet'
import { useReducedMotion } from 'motion/react'
import { getCurrentPosition } from '@/lib/native/geo'
import { rkTileUrl, type RkMapLayer } from './kit/RecordKit'

const PARIS: [number, number] = [48.8566, 2.3522]

const TOKEN = process.env.NEXT_PUBLIC_MAPBOX ?? ''
const ATTRIBUTION = '© <a href="https://www.mapbox.com/about/maps/">Mapbox</a> © <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'

// Leaflet pose ces couleurs en attributs SVG : var(--token) n'y est pas lu.
const ROUTE_CYAN = '#06B6D4' // design-allow-color — tracé parcours (= --primary)
const ROUTE_CASING = '#FFFFFF' // design-allow-color — halo blanc du tracé
const START_GREEN = '#10B981' // design-allow-color — pastille départ
const FINISH_RED = '#EF4444' // design-allow-color — pastille arrivée
const TRACK_BLUE = '#2563EB' // design-allow-color — trace GPS enregistrée

const gpsIcon = L.divIcon({
  className: 'record-gps-marker',
  html:
    '<div class="record-gps-halo"></div>' +
    '<div class="record-gps-dot"></div>',
  iconSize: [16, 16],
  iconAnchor: [8, 8],
})

interface ActiveRoute {
  snapped_points: { lat: number; lng: number }[]
  elevation_profile: { distanceM: number; altitudeM: number }[]
}

export interface MapFitPadding { top: number; bottom: number }

/** Suivi simple de la position (écrans live historiques). */
function FlyToPosition({ position }: { position: [number, number] | null }) {
  const map = useMap()
  useEffect(() => {
    if (position) map.setView(position, 15, { animate: true })
  }, [map, position])
  return null
}

/**
 * Cadrage de l'écran de départ : le parcours (et la position si proche) tient
 * dans la zone VISIBLE de la carte — au-dessus de la feuille du bas (padding
 * bas = hauteur courante de la feuille + 24) et sous l'en-tête. Recadre en
 * douceur à chaque changement de cran ; « me localiser » recentre sur la
 * position dans la même zone visible.
 */
function SmartFit({ route, position, padding, recenterKey, includePosition }: {
  route: ActiveRoute | null | undefined
  position: [number, number] | null
  padding: MapFitPadding
  recenterKey: number
  includePosition: boolean
}) {
  const map = useMap()
  const reduce = useReducedMotion()
  const lastRecenter = useRef(recenterKey)
  const opts = (): L.FitBoundsOptions => ({
    paddingTopLeft: [24, padding.top],
    paddingBottomRight: [24, padding.bottom],
    animate: !reduce,
    duration: 0.45,
    maxZoom: 16,
  })
  // Taille réelle du conteneur (portal / animations d'entrée).
  useEffect(() => { const id = window.setTimeout(() => map.invalidateSize(false), 60); return () => clearTimeout(id) }, [map])

  const routeKey = route ? `${route.snapped_points.length}:${route.snapped_points[0]?.lat}:${route.snapped_points[0]?.lng}` : ''
  const hasPos = position != null
  useEffect(() => {
    const pts = route?.snapped_points ?? []
    if (pts.length >= 2) {
      const b = L.latLngBounds(pts.map(p => [p.lat, p.lng] as [number, number]))
      if (includePosition && position) {
        const start = L.latLng(pts[0].lat, pts[0].lng)
        if (start.distanceTo(L.latLng(position[0], position[1])) < 20000) b.extend(position)
      }
      map.fitBounds(b, opts())
      return
    }
    if (position) map.fitBounds(L.latLng(position[0], position[1]).toBounds(900), opts())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, routeKey, padding.top, padding.bottom, hasPos])

  useEffect(() => {
    if (recenterKey === lastRecenter.current) return
    lastRecenter.current = recenterKey
    if (position) map.fitBounds(L.latLng(position[0], position[1]).toBounds(700), opts())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recenterKey])
  return null
}

function TrackPolyline({ points }: { points: { lat: number; lng: number }[] }) {
  const map = useMap()
  useEffect(() => {
    if (points.length < 2) return
    const latlngs = points.map(p => [p.lat, p.lng] as [number, number])
    const polyline = L.polyline(latlngs, { color: TRACK_BLUE, weight: 4, opacity: 0.9 })
    polyline.addTo(map)
    return () => { polyline.remove() }
  }, [map, points])
  return null
}

/** Pile Plan / Satellite / Hybride (écrans live historiques sans menu externe). */
function LayerSelector({ layer, onChange, top }: {
  layer: RkMapLayer; onChange: (l: RkMapLayer) => void; top?: boolean
}) {
  const items: { id: RkMapLayer; label: string }[] = [
    { id: 'std', label: 'Std' },
    { id: 'sat', label: 'Sat' },
    { id: 'hyb', label: 'Hyb' },
  ]
  return (
    <div style={{
      position: 'absolute', right: 12, zIndex: 1000,
      ...(top ? { top: 'calc(env(safe-area-inset-top) + 64px)' } : { bottom: 140 }),
      display: 'flex', flexDirection: 'column', gap: 8,
    }}>
      {items.map(it => {
        const active = layer === it.id
        return (
          <button
            key={it.id}
            type="button"
            onClick={() => onChange(it.id)}
            aria-pressed={active}
            className="thw-press"
            style={{
              width: 44, height: 44,
              borderRadius: '50%', cursor: 'pointer', border: 'none',
              background: active ? 'var(--text)' : 'var(--float-bg)',
              color: active ? 'var(--bg)' : 'var(--text)',
              fontFamily: 'var(--font-body)',
              fontSize: 11, fontWeight: 800, letterSpacing: '0.02em',
              boxShadow: 'var(--shadow-capsule)',
              transition: 'background-color 200ms ease, color 200ms ease',
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
  /** Point qui suit le survol du profil altimétrique (sync carte ↔ courbe). */
  cursorPoint?: { lat: number; lng: number } | null
  /** Sélecteur de fond de carte calé en haut à droite (ancien écran de départ). */
  controlsTop?: boolean
  /** Fond de carte contrôlé de l'extérieur (menu « couches ») : masque la pile interne. */
  layer?: RkMapLayer
  /** Zone visible (écran de départ) : active le cadrage intelligent. */
  fitPadding?: MapFitPadding
  /** Incrémenter → recentre sur la position (« me localiser »). */
  recenterKey?: number
  /** Notifie la position connue (repli interne compris). */
  onPosition?: (p: [number, number] | null) => void
}

export default function MapBackground({ trackPoints, currentPosition, activeRoute, cursorPoint, controlsTop, layer: layerProp, fitPadding, recenterKey = 0, onPosition }: Props) {
  const [internalPosition, setInternalPosition] = useState<[number, number] | null>(null)
  const [innerLayer, setInnerLayer] = useState<RkMapLayer>('std')
  const layer = layerProp ?? innerLayer

  useEffect(() => {
    if (currentPosition != null) return
    getCurrentPosition(
      (pos) => setInternalPosition([pos.coords.latitude, pos.coords.longitude]),
      () => setInternalPosition(null),
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
    )
  }, [currentPosition])

  const position: [number, number] | null = currentPosition ?? internalPosition
  useEffect(() => { onPosition?.(position) }, [position?.[0], position?.[1]]) // eslint-disable-line react-hooks/exhaustive-deps
  const smart = fitPadding != null
  const routePts = activeRoute?.snapped_points ?? []

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <MapContainer
        center={position ?? PARIS}
        zoom={15}
        zoomControl={false}
        attributionControl={false}
        style={{ width: '100%', height: '100%' }}
      >
        <TileLayer key={layer} url={rkTileUrl(layer, TOKEN)} tileSize={512} zoomOffset={-1} detectRetina={true} maxZoom={20} attribution={ATTRIBUTION} />
        {position && <Marker position={position} icon={gpsIcon} />}
        {smart
          ? <SmartFit route={activeRoute} position={position} padding={fitPadding} recenterKey={recenterKey} includePosition />
          : <FlyToPosition position={routePts.length > 1 ? null : position} />}
        {trackPoints && trackPoints.length > 1 && <TrackPolyline points={trackPoints} />}
        {routePts.length > 1 && (
          <>
            {/* Même tracé épais que l'éditeur : halo blanc + trait cyan. */}
            <Polyline
              positions={routePts.map(p => [p.lat, p.lng] as [number, number])}
              pathOptions={{ color: ROUTE_CASING, weight: 11, opacity: 0.7, lineCap: 'round', lineJoin: 'round' }}
            />
            <Polyline
              positions={routePts.map(p => [p.lat, p.lng] as [number, number])}
              pathOptions={{ color: ROUTE_CYAN, weight: 7, opacity: 1, lineCap: 'round', lineJoin: 'round' }}
            />
            <CircleMarker
              center={[routePts[0].lat, routePts[0].lng]}
              radius={6}
              pathOptions={{ fillColor: START_GREEN, fillOpacity: 1, color: ROUTE_CASING, weight: 2 }}
            />
            <CircleMarker
              center={[routePts[routePts.length - 1].lat, routePts[routePts.length - 1].lng]}
              radius={6}
              pathOptions={{ fillColor: FINISH_RED, fillOpacity: 1, color: ROUTE_CASING, weight: 2 }}
            />
            {!smart && <LegacyFit route={activeRoute} />}
          </>
        )}
        {/* Point mobile synchronisé avec le survol du profil altimétrique. */}
        {cursorPoint && (
          <CircleMarker
            center={[cursorPoint.lat, cursorPoint.lng]}
            radius={7}
            pathOptions={{ fillColor: ROUTE_CYAN, fillOpacity: 1, color: ROUTE_CASING, weight: 3 }}
          />
        )}
      </MapContainer>
      {layerProp == null && <LayerSelector layer={innerLayer} onChange={setInnerLayer} top={controlsTop} />}
    </div>
  )
}

/** Cadrage historique (sans zone visible) : parcours entier, marge fixe. */
function LegacyFit({ route }: { route: ActiveRoute | null | undefined }) {
  const map = useMap()
  useEffect(() => {
    if (!route || route.snapped_points.length < 2) return
    map.fitBounds(route.snapped_points.map(p => [p.lat, p.lng] as [number, number]), { padding: [40, 40] })
  }, [map, route])
  return null
}
