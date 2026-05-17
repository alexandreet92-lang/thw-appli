'use client'

export interface GpxPoint { lat: number; lon: number }

interface Props {
  trace: GpxPoint[]
  width?: number
  height?: number
  color?: string
}

/** Lightweight non-interactive SVG route preview — no Leaflet dependency. */
export default function GpxRouteSvg({ trace, width = 200, height = 110, color = '#00c8e0' }: Props) {
  if (trace.length < 2) return null

  const lats = trace.map(p => p.lat)
  const lons = trace.map(p => p.lon)
  const minLat = Math.min(...lats), maxLat = Math.max(...lats)
  const minLon = Math.min(...lons), maxLon = Math.max(...lons)
  const pad = 8

  const rangeX = maxLon - minLon || 1e-6
  const rangeY = maxLat - minLat || 1e-6
  const scale  = Math.min((width - pad * 2) / rangeX, (height - pad * 2) / rangeY)

  function toSvg(p: GpxPoint) {
    const x = pad + (p.lon - minLon) * scale
    // Flip y: higher lat = higher on screen
    const y = height - pad - (p.lat - minLat) * scale
    return `${x.toFixed(1)},${y.toFixed(1)}`
  }

  const points = trace.map(toSvg).join(' ')

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width={width} height={height}
      style={{ display: 'block', borderRadius: 6, background: '#111827' }}
    >
      <polyline points={points} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      {/* Start dot */}
      <circle cx={trace[0] ? toSvg(trace[0]).split(',')[0] : 0} cy={trace[0] ? toSvg(trace[0]).split(',')[1] : 0} r={3} fill="#22c55e" />
      {/* End dot */}
      <circle cx={trace[trace.length-1] ? toSvg(trace[trace.length-1]).split(',')[0] : 0} cy={trace[trace.length-1] ? toSvg(trace[trace.length-1]).split(',')[1] : 0} r={3} fill="#ef4444" />
    </svg>
  )
}

/** Parse GPS trace points from GPX XML text. */
export function parseGpxText(text: string): GpxPoint[] {
  const doc = new DOMParser().parseFromString(text, 'application/xml')
  const pts: GpxPoint[] = []
  const nodes = doc.querySelectorAll('trkpt,rtept,wpt')
  for (const n of Array.from(nodes)) {
    const lat = parseFloat(n.getAttribute('lat') ?? '')
    const lon = parseFloat(n.getAttribute('lon') ?? '')
    if (!isNaN(lat) && !isNaN(lon)) pts.push({ lat, lon })
  }
  // Decimate: keep 1 point per ~200 points for performance
  if (pts.length > 400) {
    const step = Math.ceil(pts.length / 400)
    return pts.filter((_, i) => i % step === 0 || i === pts.length - 1)
  }
  return pts
}
