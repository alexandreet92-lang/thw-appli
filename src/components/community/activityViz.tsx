'use client'
// ══════════════════════════════════════════════════════════════════════════
// Rendus SVG bruts (zéro lib) pour une activité partagée : tracé (depuis la
// polyline encodée) + profil altimétrique (depuis un tableau d'altitudes).
// ══════════════════════════════════════════════════════════════════════════
import { polylineToSvgPath, decodePolyline } from '@/lib/profile/activityShowcase'
import { staticRouteMapUrl, hasStaticMap } from '@/lib/staticMap'

export function RouteSvg({ polyline, vw = 340, vh = 150, height }: { polyline?: string | null; vw?: number; vh?: number; height?: number }) {
  const d = polylineToSvgPath(polyline ?? null, vw, vh, 8)
  if (!d) return null
  return (
    <svg width="100%" height={height} viewBox={`0 0 ${vw} ${vh}`} preserveAspectRatio="xMidYMid meet"
      style={{ display: 'block', borderRadius: 'var(--r-sm)', background: 'var(--surface-neutral)' }}>
      <path d={d} fill="none" stroke="var(--primary)" strokeWidth={2.4} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  )
}

// Vraie carte (fond Mapbox : villes, relief) avec le tracé dessiné dessus, via
// l'image statique Mapbox — aucune lib carte chargée, juste une <img>. Repli sur
// le tracé SVG nu si pas de token Mapbox ou pas de GPS.
export function RouteMap({ polyline, height = 150, width = 340 }: { polyline?: string | null; height?: number; width?: number }) {
  if (!polyline) return null
  if (hasStaticMap()) {
    const pts = decodePolyline(polyline).map(([lat, lng]) => ({ lat, lng }))
    const url = staticRouteMapUrl(pts, { width, height, pins: true })
    if (url) {
      return (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="Carte du parcours" loading="lazy" decoding="async"
          style={{ display: 'block', width: '100%', height, objectFit: 'cover', borderRadius: 'var(--r-sm)', background: 'var(--surface-neutral)' }} />
      )
    }
  }
  return <RouteSvg polyline={polyline} height={height} />
}

export function ElevationSvg({ elevation, vw = 340, vh = 60, height }: { elevation?: number[] | null; vw?: number; vh?: number; height?: number }) {
  if (!elevation || elevation.length < 2) return null
  const min = Math.min(...elevation), max = Math.max(...elevation)
  const range = max - min || 1
  const n = elevation.length
  const pts = elevation.map((e, i) => [(i / (n - 1)) * vw, vh - ((e - min) / range) * (vh - 4) - 2] as const)
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ')
  const area = `${line} L ${vw} ${vh} L 0 ${vh} Z`
  return (
    <svg width="100%" height={height} viewBox={`0 0 ${vw} ${vh}`} preserveAspectRatio="none" style={{ display: 'block' }}>
      <path d={area} fill="var(--primary-dim)" />
      <path d={line} fill="none" stroke="var(--primary)" strokeWidth={1.5} strokeLinejoin="round" />
    </svg>
  )
}
