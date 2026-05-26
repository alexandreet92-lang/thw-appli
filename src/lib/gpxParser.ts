import type { Waypoint, ElevPoint } from './openrouteservice'

export interface ParsedGPX {
  waypoints: Waypoint[]
  elevationProfile: ElevPoint[]
  distanceM: number
  elevGain: number
}

function haversine(a: Waypoint, b: Waypoint): number {
  const R = 6371000
  const dLat = (b.lat - a.lat) * Math.PI / 180
  const dLng = (b.lng - a.lng) * Math.PI / 180
  const la1 = a.lat * Math.PI / 180, la2 = b.lat * Math.PI / 180
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s))
}

export function parseGPX(gpxText: string): ParsedGPX {
  const parser = new DOMParser()
  const doc = parser.parseFromString(gpxText, 'application/xml')
  const trkpts = Array.from(doc.querySelectorAll('trkpt'))

  const waypoints: Waypoint[] = trkpts.map(pt => ({
    lat: parseFloat(pt.getAttribute('lat') ?? '0'),
    lng: parseFloat(pt.getAttribute('lon') ?? '0'),
  }))

  const altitudes = trkpts.map(pt => {
    const ele = pt.querySelector('ele')
    return ele ? parseFloat(ele.textContent ?? '0') : 0
  })

  let distanceM = 0
  let elevGain = 0

  const elevationProfile: ElevPoint[] = waypoints.map((wp, i) => {
    if (i > 0) {
      distanceM += haversine(waypoints[i - 1], wp)
      const diff = altitudes[i] - altitudes[i - 1]
      if (diff > 0) elevGain += diff
    }
    return { distanceM: Math.round(distanceM), altitudeM: Math.round(altitudes[i]) }
  })

  return { waypoints, elevationProfile, distanceM, elevGain }
}
