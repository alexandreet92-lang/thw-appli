// Vignette « vraie carte » via l'API Mapbox Static Images : une image PNG de la
// carte (villes, villages, relief) avec le tracé dessiné dessus. Aucune lib de
// carte à charger côté client — juste une <img>. Repli SVG si pas de token.
const TOKEN = process.env.NEXT_PUBLIC_MAPBOX ?? ''

// Encodage polyline Google (précision 5) — compact pour tenir dans l'URL.
function encodePolyline(points: { lat: number; lng: number }[]): string {
  let lastLat = 0, lastLng = 0, out = ''
  const enc = (v: number) => {
    let val = v < 0 ? ~(v << 1) : (v << 1)
    let s = ''
    while (val >= 0x20) { s += String.fromCharCode((0x20 | (val & 0x1f)) + 63); val >>= 5 }
    s += String.fromCharCode(val + 63)
    return s
  }
  for (const p of points) {
    const lat = Math.round(p.lat * 1e5), lng = Math.round(p.lng * 1e5)
    out += enc(lat - lastLat) + enc(lng - lastLng)
    lastLat = lat; lastLng = lng
  }
  return out
}

function downsample<T>(arr: T[], max: number): T[] {
  if (arr.length <= max) return arr
  const step = arr.length / max
  return Array.from({ length: max }, (_, i) => arr[Math.round(i * step)])
}

export function hasStaticMap(): boolean {
  return !!TOKEN
}

/** URL d'une image Mapbox (carte réelle) avec le tracé + départ/arrivée, ou null. */
export function staticRouteMapUrl(
  points: { lat: number; lng: number }[],
  opts: { width?: number; height?: number; color?: string; pins?: boolean } = {},
): string | null {
  if (!TOKEN || !points || points.length < 2) return null
  const w = opts.width ?? 360
  const h = opts.height ?? 225
  const color = (opts.color ?? '06B6D4').replace('#', '')
  // ~120 points suffisent pour un tracé net et gardent l'URL bien en-dessous
  // de la limite (~8192 caractères).
  const poly = encodePolyline(downsample(points, 120))
  const overlays: string[] = [`path-4+${color}-0.95(${encodeURIComponent(poly)})`]
  if (opts.pins !== false) {
    const s = points[0], e = points[points.length - 1]
    // Départ vert · arrivée rouge (repères de la carte réelle).
    overlays.unshift(`pin-s+ef4444(${e.lng.toFixed(5)},${e.lat.toFixed(5)})`)
    overlays.unshift(`pin-s+10b981(${s.lng.toFixed(5)},${s.lat.toFixed(5)})`)
  }
  return `https://api.mapbox.com/styles/v1/mapbox/outdoors-v12/static/${overlays.join(',')}/auto/${w}x${h}@2x?access_token=${TOKEN}&padding=26`
}
