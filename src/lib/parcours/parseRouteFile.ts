// ══════════════════════════════════════════════════════════════════════
// parseRouteFile — parse un fichier de parcours (GPX / TCX / KML) en
// ParcoursData, au FORMAT EXACT attendu par le planning (colonne
// planned_sessions.parcours_data, lu par SessionEditor). Reprend la logique
// de SessionEditor.parseRouteFile, hors segmentation (segments optionnels).
// Sert à synchroniser un parcours de jour de stage vers le planning.
// ══════════════════════════════════════════════════════════════════════

export interface RouteParcoursData {
  name: string
  distance: number | null            // km
  elevation: number | null           // D+ cumulé (m)
  points: number
  elevationProfile: Array<{ distKm: number; ele: number }>
  gpsTrace: Array<{ lat: number; lon: number }>
  avgSpeed: number | null
}

interface Pt { lat: number; lon: number; ele: number }

function haversineM(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function buildGpsTrace(pts: Pt[]): Array<{ lat: number; lon: number }> {
  const trace: Array<{ lat: number; lon: number }> = []
  for (const pt of pts) {
    if (trace.length === 0) {
      trace.push({ lat: pt.lat, lon: pt.lon })
    } else {
      const prev = trace[trace.length - 1]
      const d = haversineM(prev.lat, prev.lon, pt.lat, pt.lon)
      if (d >= 100) trace.push({ lat: pt.lat, lon: pt.lon })
    }
  }
  if (pts.length > 0) {
    const last = pts[pts.length - 1]
    const t = trace[trace.length - 1]
    if (!t || t.lat !== last.lat || t.lon !== last.lon) trace.push({ lat: last.lat, lon: last.lon })
  }
  return trace
}

function buildElevationProfile(pts: Pt[]): { distKm: number; elevM: number; profile: Array<{ distKm: number; ele: number }> } {
  const profile: Array<{ distKm: number; ele: number }> = []
  let cumDist = 0
  let elevM = 0
  for (let i = 0; i < pts.length; i++) {
    if (i > 0) {
      cumDist += haversineM(pts[i - 1].lat, pts[i - 1].lon, pts[i].lat, pts[i].lon)
      const diff = pts[i].ele - pts[i - 1].ele
      if (diff > 0) elevM += diff
    }
    const distKm = Math.round(cumDist / 100) / 10
    const lastKm = profile.length > 0 ? profile[profile.length - 1].distKm : -1
    if (distKm - lastKm >= 0.2 || i === 0) {
      profile.push({ distKm, ele: Math.round(pts[i].ele) })
    }
  }
  if (pts.length > 0) {
    const finalKm = Math.round(cumDist / 100) / 10
    const lastKm = profile.length > 0 ? profile[profile.length - 1].distKm : 0
    if (finalKm > lastKm) profile.push({ distKm: finalKm, ele: Math.round(pts[pts.length - 1].ele) })
  }
  return { distKm: Math.round(cumDist / 100) / 10, elevM: Math.round(elevM), profile }
}

function pointsFromText(text: string, ext: string): { pts: Pt[]; name: string } {
  const parser = new DOMParser()
  let pts: Pt[] = []
  let name = ''
  if (ext === 'gpx') {
    const doc = parser.parseFromString(text, 'application/xml')
    name = doc.querySelector('name')?.textContent?.trim() ?? ''
    const trkpts = Array.from(doc.querySelectorAll('trkpt'))
    const src = trkpts.length > 0 ? trkpts : Array.from(doc.querySelectorAll('wpt, rtept'))
    pts = src.map(pt => ({
      lat: parseFloat(pt.getAttribute('lat') ?? '0'),
      lon: parseFloat(pt.getAttribute('lon') ?? '0'),
      ele: parseFloat(pt.querySelector('ele')?.textContent ?? '0'),
    }))
  } else if (ext === 'tcx') {
    const doc = parser.parseFromString(text, 'application/xml')
    name = doc.querySelector('Id')?.textContent?.trim() ?? ''
    pts = Array.from(doc.querySelectorAll('Trackpoint')).map(tp => ({
      lat: parseFloat(tp.querySelector('LatitudeDegrees')?.textContent ?? '0'),
      lon: parseFloat(tp.querySelector('LongitudeDegrees')?.textContent ?? '0'),
      ele: parseFloat(tp.querySelector('AltitudeMeters')?.textContent ?? '0'),
    })).filter(p => p.lat !== 0 || p.lon !== 0)
  } else if (ext === 'kml') {
    const doc = parser.parseFromString(text, 'application/xml')
    name = doc.querySelector('name')?.textContent?.trim() ?? ''
    const coords = doc.querySelector('coordinates')?.textContent?.trim() ?? ''
    pts = coords.split(/\s+/).filter(Boolean).map(c => {
      const [lon, lat, ele] = c.split(',').map(Number)
      return { lat: lat ?? 0, lon: lon ?? 0, ele: ele ?? 0 }
    })
  }
  return { pts, name }
}

/** Parse un File (GPX/TCX/KML). Renvoie null si format non géré ou aucun point. */
export function parseRouteFile(file: File): Promise<RouteParcoursData | null> {
  return new Promise((resolve) => {
    const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
    if (!['gpx', 'tcx', 'kml'].includes(ext)) { resolve(null); return }
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const text = (e.target?.result as string) ?? ''
        const { pts, name } = pointsFromText(text, ext)
        if (pts.length === 0) { resolve(null); return }
        const { distKm, elevM, profile } = buildElevationProfile(pts)
        resolve({
          name: name || file.name.replace(/\.[^.]+$/, ''),
          distance: distKm > 0 ? distKm : null,
          elevation: elevM > 0 ? elevM : null,
          points: pts.length,
          elevationProfile: profile,
          gpsTrace: buildGpsTrace(pts),
          avgSpeed: null,
        })
      } catch { resolve(null) }
    }
    reader.onerror = () => resolve(null)
    reader.readAsText(file)
  })
}

export function isRouteFileName(n: string): boolean {
  const ext = n.split('.').pop()?.toLowerCase() ?? ''
  return ext === 'gpx' || ext === 'tcx' || ext === 'kml'
}
