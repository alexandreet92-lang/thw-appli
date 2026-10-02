'use client'

// ══════════════════════════════════════════════════════════════
// FeedRouteMap — aperçu STATIQUE du tracé GPS d'une activité dans le fil
// (façon Strava). Fond Mapbox Static Images centré/zoomé par NOTRE calcul
// de fit-bounds (Web Mercator, tuiles 512 px) à la largeur réelle du cadre,
// et tracé dessiné en SVG par-dessus avec la même projection :
//   • tracé ENTIER toujours visible (marge ≥ 24 px, plus en haut pour
//     l'étiquette), jamais rogné par l'écran ni la carte ;
//   • trait épais couleur du sport + liseré blanc, point de départ vert,
//     arrivée en damier ;
//   • aucune interaction : pointer-events none, pas de drag/zoom, pas de
//     voile gris à l'appui (le tap remonte à la carte d'activité).
// ══════════════════════════════════════════════════════════════

import { useEffect, useId, useMemo, useRef, useState } from 'react'

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX ?? ''
const TILE = 512        // Mapbox Static Images : tuiles de 512 px
const MAX_DIM = 1280    // dimension max (px logiques) acceptée par l'API
const MAX_ZOOM = 16
// Marges autour du tracé (px). En haut : place pour l'étiquette « Entraînement ».
const PAD = { top: 46, right: 24, bottom: 28, left: 24 }

interface Props {
  encodedPolyline: string
  /** Couleur du sport (hex) — trait du tracé. */
  color:           string
  /** Étiquette en haut à gauche (« Entraînement » / « Compétition »). */
  label?:          string
  /** Hauteur / largeur du cadre (défaut 2/3, comme Strava). */
  ratio?:          number
}

type Pt = [number, number] // [lat, lng]

function decodePolyline(str: string): Pt[] {
  const pts: Pt[] = []
  let index = 0, lat = 0, lng = 0
  while (index < str.length) {
    let shift = 0, result = 0, b: number
    do { b = str.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5 } while (b >= 0x20 && index < str.length)
    lat += (result & 1) ? ~(result >> 1) : (result >> 1)
    shift = 0; result = 0
    do { b = str.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5 } while (b >= 0x20 && index < str.length)
    lng += (result & 1) ? ~(result >> 1) : (result >> 1)
    const p: Pt = [lat * 1e-5, lng * 1e-5]
    if (Number.isFinite(p[0]) && Number.isFinite(p[1]) && Math.abs(p[0]) <= 85 && Math.abs(p[1]) <= 180) pts.push(p)
  }
  return pts
}

// Web Mercator normalisé [0,1]
const mercX = (lng: number) => (lng + 180) / 360
const mercY = (lat: number) => {
  const s = Math.min(0.9999, Math.max(-0.9999, Math.sin((lat * Math.PI) / 180)))
  return 0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)
}
const invY = (y: number) => (360 / Math.PI) * Math.atan(Math.exp((0.5 - y) * 2 * Math.PI)) - 90

interface Fit {
  url:   string | null
  path:  string
  start: [number, number]
  end:   [number, number]
}

function computeFit(pts: Pt[], W: number, H: number, dark: boolean): Fit | null {
  if (pts.length < 2 || W < 40 || H < 40) return null
  const xs = pts.map(p => mercX(p[1]))
  const ys = pts.map(p => mercY(p[0]))
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
  for (let i = 0; i < xs.length; i++) {
    if (xs[i] < minX) minX = xs[i]; if (xs[i] > maxX) maxX = xs[i]
    if (ys[i] < minY) minY = ys[i]; if (ys[i] > maxY) maxY = ys[i]
  }
  const availW = Math.max(10, W - PAD.left - PAD.right)
  const availH = Math.max(10, H - PAD.top - PAD.bottom)
  const spanX = Math.max(maxX - minX, 1e-9)
  const spanY = Math.max(maxY - minY, 1e-9)
  // Zoom fractionnaire arrondi VERS LE BAS (2 décimales) → le tracé tient toujours.
  let z = Math.log2(Math.min(availW / spanX, availH / spanY) / TILE)
  z = Math.max(1, Math.min(MAX_ZOOM, Math.floor(z * 100) / 100))
  const scale = TILE * Math.pow(2, z)
  // Le centre du tracé se place au centre de la zone utile (marges asymétriques).
  const tcx = (minX + maxX) / 2
  const tcy = (minY + maxY) / 2
  const lng = +((tcx - (PAD.left - PAD.right) / 2 / scale) * 360 - 180).toFixed(6)
  const lat = +invY(tcy - (PAD.top - PAD.bottom) / 2 / scale).toFixed(6)
  // Projection recalculée sur le centre ARRONDI envoyé à l'API → alignement exact.
  const cx = mercX(lng), cy = mercY(lat)
  const proj = (i: number): [number, number] => [(xs[i] - cx) * scale + W / 2, (ys[i] - cy) * scale + H / 2]

  let d = ''
  let last: [number, number] | null = null
  for (let i = 0; i < xs.length; i++) {
    const p = proj(i)
    const isLast = i === xs.length - 1
    if (last && !isLast && Math.abs(p[0] - last[0]) < 0.6 && Math.abs(p[1] - last[1]) < 0.6) continue
    d += `${last ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`
    last = p
  }

  const style = dark ? 'dark-v11' : 'outdoors-v12'
  const url = MAPBOX_TOKEN
    ? `https://api.mapbox.com/styles/v1/mapbox/${style}/static/${lng},${lat},${z},0/${W}x${H}@2x?access_token=${MAPBOX_TOKEN}`
    : null
  return { url, path: d, start: proj(0), end: proj(xs.length - 1) }
}

/** Thème sombre actif (classe .dark sur <html>, posée par useTheme). */
function useDarkClass(): boolean {
  const [dark, setDark] = useState(false)
  useEffect(() => {
    const root = document.documentElement
    const read = () => setDark(root.classList.contains('dark'))
    read()
    const mo = new MutationObserver(read)
    mo.observe(root, { attributes: true, attributeFilter: ['class'] })
    return () => mo.disconnect()
  }, [])
  return dark
}

export function FeedRouteMap({ encodedPolyline, color, label, ratio = 2 / 3 }: Props) {
  const boxRef = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(0)
  const [loaded, setLoaded] = useState(false)
  const dark = useDarkClass()
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '')

  // Largeur RÉELLE du cadre (pleine largeur d'écran sur mobile) → image demandée
  // à la bonne taille (@2x), sans recadrage CSS qui couperait le tracé.
  useEffect(() => {
    const el = boxRef.current
    if (!el) return
    const read = () => {
      const w = Math.round(el.getBoundingClientRect().width)
      setWidth(prev => (Math.abs(prev - w) >= 4 ? w : prev))
    }
    read()
    if (typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(read)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const pts = useMemo(() => decodePolyline(encodedPolyline), [encodedPolyline])
  const W = Math.min(MAX_DIM, width)
  const H = Math.min(MAX_DIM, Math.round(W * ratio))
  const fit = useMemo(() => computeFit(pts, W, H, dark), [pts, W, H, dark])

  useEffect(() => { setLoaded(false) }, [fit?.url])

  const noTouch: React.CSSProperties = {
    pointerEvents: 'none', userSelect: 'none', WebkitUserSelect: 'none',
    WebkitTouchCallout: 'none', WebkitTapHighlightColor: 'transparent',
  }

  return (
    <div
      ref={boxRef}
      aria-hidden
      style={{
        ...noTouch,
        position: 'relative', width: '100%', aspectRatio: `${1} / ${ratio}`,
        overflow: 'hidden', background: 'var(--bg-card2)',
      }}
    >
      {fit?.url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={fit.url} alt="" draggable={false} loading="lazy" decoding="async"
          onLoad={() => setLoaded(true)}
          style={{
            ...noTouch, position: 'absolute', inset: 0, width: '100%', height: '100%',
            objectFit: 'cover', display: 'block',
            opacity: loaded ? 1 : 0, transition: 'opacity 0.25s ease',
          }}
        />
      )}
      {fit && (
        <svg
          viewBox={`0 0 ${W} ${H}`} width="100%" height="100%"
          style={{ ...noTouch, position: 'absolute', inset: 0, overflow: 'visible' }}
        >
          <defs>
            <pattern id={`chk-${uid}`} width="4" height="4" patternUnits="userSpaceOnUse">
              <rect width="4" height="4" fill="#ffffff" /> {/* design-allow-color — damier d'arrivée */}
              <rect width="2" height="2" fill="#111111" /> {/* design-allow-color */}
              <rect x="2" y="2" width="2" height="2" fill="#111111" /> {/* design-allow-color */}
            </pattern>
          </defs>
          {/* Liseré (contraste sur le fond de carte) puis trait couleur du sport */}
          <path d={fit.path} fill="none" stroke={dark ? 'rgba(0,0,0,0.55)' : 'rgba(255,255,255,0.95)'} strokeWidth={7.5} strokeLinecap="round" strokeLinejoin="round" /> {/* design-allow-color */}
          <path d={fit.path} fill="none" stroke={color} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
          {/* Arrivée (damier) sous le départ (vert) quand la boucle se referme */}
          <circle cx={fit.end[0]} cy={fit.end[1]} r={6.5} fill={`url(#chk-${uid})`} stroke="#ffffff" strokeWidth={2} /> {/* design-allow-color */}
          <circle cx={fit.start[0]} cy={fit.start[1]} r={6.5} style={{ fill: 'var(--success)' }} stroke="#ffffff" strokeWidth={2} /> {/* design-allow-color */}
        </svg>
      )}
      {label && (
        <span style={{
          ...noTouch,
          position: 'absolute', top: 12, left: 12,
          padding: '5px 10px', borderRadius: 'var(--r-sm)',
          fontSize: 13, fontWeight: 700, lineHeight: 1.2, fontFamily: 'var(--font-body)',
          color: '#111111', background: '#ffffff', // design-allow-color — étiquette blanche sur la carte (façon Strava)
          boxShadow: '0 1px 3px rgba(0,0,0,0.18)', // design-allow-color
        }}>
          {label}
        </span>
      )}
    </div>
  )
}
