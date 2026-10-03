// ══════════════════════════════════════════════════════════════════
// routeMap — géométrie partagée des aperçus STATIQUES de tracé GPS
// (fil d'activités, fiche activité du planning, popovers…).
//
//  • Web Mercator « tuiles 512 » (convention Mapbox : à zoom z, le monde
//    mesure 512·2^z px) → la même projection sert à :
//      – l'URL Mapbox Static Images (centre + zoom calculés ICI, pas « auto »),
//      – l'assemblage de tuiles raster (repli si l'image statique échoue),
//      – le tracé SVG dessiné par-dessus (alignement exact au pixel).
//  • Jeton : NEXT_PUBLIC_MAPBOX — la MÊME variable que la carte de l'écran
//    « Lancer » (rkTileUrl / MapBackground), inlinée par Next au build.
//    Accès littéral obligatoire (process.env.NEXT_PUBLIC_MAPBOX) pour que
//    Next la remplace aussi dans le build statique Capacitor.
//  • Limites de l'API Static Images respectées : largeur/hauteur ≤ 1280 px
//    logiques (avant @2x), zoom ≤ 22, aucune surcharge d'URL (le tracé est
//    dessiné en SVG, jamais encodé dans l'URL → pas de limite de longueur).
// ══════════════════════════════════════════════════════════════════

export type LatLng = [number, number] // [lat, lng]

export const MAPBOX_TOKEN: string = process.env.NEXT_PUBLIC_MAPBOX ?? ''

/** Style « Strava » : carte en couleurs (relief, routes, forêts), jamais sombre. */
export const ROUTE_MAP_STYLE = 'outdoors-v12'
/** Taille d'une tuile Mapbox (px logiques). */
export const TILE_PX = 512
/** Dimension max acceptée par l'API Static Images (px logiques, avant @2x). */
export const STATIC_MAX_DIM = 1280
const MAX_ZOOM = 17
const MIN_ZOOM = 1

export interface MapPad { top: number; right: number; bottom: number; left: number }

// ── Polyline Google (précision 5) ─────────────────────────────────
export function decodePolyline(str: string): LatLng[] {
  const pts: LatLng[] = []
  let index = 0, lat = 0, lng = 0
  const len = str.length
  while (index < len) {
    let shift = 0, result = 0, b: number
    do { b = str.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5 } while (b >= 0x20 && index < len)
    lat += (result & 1) ? ~(result >> 1) : (result >> 1)
    shift = 0; result = 0
    do { b = str.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5 } while (b >= 0x20 && index < len)
    lng += (result & 1) ? ~(result >> 1) : (result >> 1)
    const p: LatLng = [lat * 1e-5, lng * 1e-5]
    if (isValidLatLng(p)) pts.push(p)
  }
  return pts
}

export function isValidLatLng(p: unknown): p is LatLng {
  if (!Array.isArray(p) || p.length < 2) return false
  const la = Number(p[0]), lo = Number(p[1])
  // (0,0) = point GPS vide fréquent dans les streams → ignoré.
  return Number.isFinite(la) && Number.isFinite(lo) && Math.abs(la) <= 85 && Math.abs(lo) <= 180 && !(la === 0 && lo === 0)
}

/** Nettoie une liste de positions (streams latlng, points d'un parcours…). */
export function cleanLatLng(points: readonly unknown[] | null | undefined): LatLng[] {
  if (!points || !Array.isArray(points)) return []
  const out: LatLng[] = []
  for (const p of points) if (isValidLatLng(p)) out.push([Number(p[0]), Number(p[1])])
  return out
}

// ── Web Mercator normalisé [0,1] ──────────────────────────────────
export const mercX = (lng: number): number => (lng + 180) / 360
export const mercY = (lat: number): number => {
  const s = Math.min(0.9999, Math.max(-0.9999, Math.sin((lat * Math.PI) / 180)))
  return 0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)
}
const invY = (y: number): number => (360 / Math.PI) * Math.atan(Math.exp((0.5 - y) * 2 * Math.PI)) - 90

export interface RouteFit {
  /** Taille de la vue (px logiques) — identique à l'image demandée. */
  W: number
  H: number
  /** Zoom fractionnaire (2 décimales) et centre ARRONDIS tels qu'envoyés à l'API. */
  zoom: number
  lat: number
  lng: number
  /** Chemin SVG du tracé (coordonnées de la vue). */
  path: string
  start: [number, number]
  end: [number, number]
  /** Projette une position dans la vue. */
  project: (p: LatLng) => [number, number]
}

/**
 * Cadre le tracé ENTIER dans une vue W×H avec des marges (fit-bounds).
 * Zoom arrondi VERS LE BAS au centième → le tracé tient toujours.
 */
export function computeRouteFit(points: readonly LatLng[], W: number, H: number, pad: MapPad): RouteFit | null {
  if (points.length < 2 || W < 40 || H < 40) return null
  const n = points.length
  const xs = new Float64Array(n), ys = new Float64Array(n)
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
  for (let i = 0; i < n; i++) {
    const x = mercX(points[i][1]), y = mercY(points[i][0])
    xs[i] = x; ys[i] = y
    if (x < minX) minX = x; if (x > maxX) maxX = x
    if (y < minY) minY = y; if (y > maxY) maxY = y
  }
  const availW = Math.max(10, W - pad.left - pad.right)
  const availH = Math.max(10, H - pad.top - pad.bottom)
  const spanX = Math.max(maxX - minX, 1e-9)
  const spanY = Math.max(maxY - minY, 1e-9)
  let z = Math.log2(Math.min(availW / spanX, availH / spanY) / TILE_PX)
  z = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, Math.floor(z * 100) / 100))
  const scale = TILE_PX * Math.pow(2, z)
  // Centre du tracé au centre de la zone utile (marges asymétriques).
  const tcx = (minX + maxX) / 2
  const tcy = (minY + maxY) / 2
  const lng = +((tcx - (pad.left - pad.right) / 2 / scale) * 360 - 180).toFixed(6)
  const lat = +invY(tcy - (pad.top - pad.bottom) / 2 / scale).toFixed(6)
  // Projection recalculée sur le centre ARRONDI → alignement exact avec l'image.
  const cx = mercX(lng), cy = mercY(lat)
  const px = (x: number) => (x - cx) * scale + W / 2
  const py = (y: number) => (y - cy) * scale + H / 2

  let d = ''
  let lx = NaN, ly = NaN
  for (let i = 0; i < n; i++) {
    const x = px(xs[i]), y = py(ys[i])
    const isLast = i === n - 1
    if (i > 0 && !isLast && Math.abs(x - lx) < 0.7 && Math.abs(y - ly) < 0.7) continue
    d += `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`
    lx = x; ly = y
  }
  return {
    W, H, zoom: z, lat, lng, path: d,
    start: [px(xs[0]), py(ys[0])],
    end: [px(xs[n - 1]), py(ys[n - 1])],
    project: (p: LatLng) => [px(mercX(p[1])), py(mercY(p[0]))],
  }
}

/**
 * Taille de vue à demander pour un cadre de w×h px CSS : on garde le ratio et on
 * plafonne à 1280 px logiques (limite API) — l'image est ensuite étirée en CSS.
 */
export function viewSize(w: number, h: number): { W: number; H: number } {
  const k = Math.min(1, STATIC_MAX_DIM / Math.max(1, w), STATIC_MAX_DIM / Math.max(1, h))
  return { W: Math.max(1, Math.round(w * k)), H: Math.max(1, Math.round(h * k)) }
}

/** URL Mapbox Static Images (fond seul, @2x = net sur écrans Retina). */
export function staticMapUrl(fit: RouteFit, style = ROUTE_MAP_STYLE): string | null {
  if (!MAPBOX_TOKEN) return null
  const W = Math.min(STATIC_MAX_DIM, Math.max(1, Math.round(fit.W)))
  const H = Math.min(STATIC_MAX_DIM, Math.max(1, Math.round(fit.H)))
  const z = Math.min(22, Math.max(0, fit.zoom))
  return `https://api.mapbox.com/styles/v1/mapbox/${style}/static/${fit.lng},${fit.lat},${z},0/${W}x${H}@2x?access_token=${MAPBOX_TOKEN}`
}

/** URL d'une tuile raster (même source que la carte « Lancer » : rkTileUrl 'std'). */
export function tileUrl(z: number, x: number, y: number, style = ROUTE_MAP_STYLE): string {
  return `https://api.mapbox.com/styles/v1/mapbox/${style}/tiles/512/${z}/${x}/${y}@2x?access_token=${MAPBOX_TOKEN}`
}

export interface PlacedTile { key: string; url: string; left: number; top: number; size: number }

/**
 * Tuiles raster couvrant la vue (repli quand l'image statique échoue) : zoom
 * entier inférieur, tuiles agrandies du facteur fractionnaire → même cadrage
 * que l'image statique, donc le tracé SVG reste aligné. Positions en px de vue.
 */
export function tilesForFit(fit: RouteFit, style = ROUTE_MAP_STYLE): PlacedTile[] {
  if (!MAPBOX_TOKEN) return []
  const zi = Math.max(0, Math.min(20, Math.floor(fit.zoom)))
  const s = Math.pow(2, fit.zoom - zi)
  const size = TILE_PX * s
  const world = TILE_PX * Math.pow(2, fit.zoom)
  const x0 = mercX(fit.lng) * world - fit.W / 2
  const y0 = mercY(fit.lat) * world - fit.H / 2
  const n = Math.pow(2, zi)
  const tx0 = Math.floor(x0 / size), tx1 = Math.floor((x0 + fit.W) / size)
  const ty0 = Math.floor(y0 / size), ty1 = Math.floor((y0 + fit.H) / size)
  const out: PlacedTile[] = []
  for (let ty = ty0; ty <= ty1; ty++) {
    if (ty < 0 || ty >= n) continue
    for (let tx = tx0; tx <= tx1; tx++) {
      const wx = ((tx % n) + n) % n
      out.push({
        key: `${zi}/${tx}/${ty}`,
        url: tileUrl(zi, wx, ty, style),
        left: tx * size - x0,
        top: ty * size - y0,
        size,
      })
    }
  }
  return out
}

// ── Santé de l'API statique (session) ─────────────────────────────
// Après deux échecs de l'image statique, les cartes suivantes passent
// directement par les tuiles (pas d'attente ni de flash à chaque carte).
let staticFailures = 0
export function noteStaticFailure(): void { staticFailures++ }
export function noteStaticSuccess(): void { staticFailures = 0 }
export function staticLooksBroken(): boolean { return staticFailures >= 2 }

let warnedNoToken = false
/** Avertit UNE fois si le jeton est absent du build (ex. build:cap sans .env). */
export function warnIfNoToken(): void {
  if (MAPBOX_TOKEN || warnedNoToken) return
  warnedNoToken = true
  console.warn('[maps] NEXT_PUBLIC_MAPBOX absent au build — aperçus de carte en mode tracé seul.')
}
