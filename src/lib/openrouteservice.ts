const ORS_KEY = process.env.NEXT_PUBLIC_ORS_KEY ?? ''

const ORS_PROFILES: Record<string, string> = {
  cycling: 'cycling-road',
  mtb:     'cycling-mountain',
  trail:   'foot-hiking',
  hiking:  'foot-hiking',
}

const SURFACE_TYPES: Record<number, string> = {
  0: 'unknown', 1: 'asphalt', 2: 'unpaved', 3: 'gravel',
  4: 'path',    5: 'asphalt', 6: 'gravel',  7: 'unpaved',
  8: 'path',    9: 'path',
}

export interface Waypoint { lat: number; lng: number }
export interface SnappedPoint extends Waypoint { altitude: number }
export interface Surface { type: string; percent: number }
export interface ElevPoint { distanceM: number; altitudeM: number }

export interface SnapResult {
  snappedPoints: SnappedPoint[]
  distanceM: number
  elevGain: number
  surfaces: Surface[]
  elevationProfile: ElevPoint[]
}

interface ORSSurface { value: number; distance: number }
interface ORSFeature {
  geometry: { coordinates: number[][] }
  properties: { extras?: { surface?: { summary: ORSSurface[] } } }
}

function haversine(a: Waypoint, b: Waypoint): number {
  const R = 6371000
  const dLat = (b.lat - a.lat) * Math.PI / 180
  const dLng = (b.lng - a.lng) * Math.PI / 180
  const la1 = a.lat * Math.PI / 180, la2 = b.lat * Math.PI / 180
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s))
}

export async function snapRoute(waypoints: Waypoint[], sport: string): Promise<SnapResult> {
  if (!ORS_KEY) throw new Error('NEXT_PUBLIC_ORS_KEY not configured')
  const profile = ORS_PROFILES[sport] ?? 'foot-hiking'
  const res = await fetch(
    `https://api.openrouteservice.org/v2/directions/${profile}/geojson`,
    {
      method: 'POST',
      headers: { 'Authorization': ORS_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        coordinates: waypoints.map(w => [w.lng, w.lat]),
        elevation: true,
        extra_info: ['surface'],
        instructions: false,
      }),
    }
  )
  if (!res.ok) throw new Error(`ORS ${res.status}`)
  const data = await res.json() as { features: ORSFeature[] }
  const feature = data.features[0]
  const coords = feature.geometry.coordinates

  const snappedPoints: SnappedPoint[] = coords.map(([lng, lat, alt]) => ({ lat, lng, altitude: alt ?? 0 }))

  let distanceM = 0
  let elevGain = 0
  const elevationProfile: ElevPoint[] = snappedPoints.map((p, i) => {
    if (i > 0) {
      distanceM += haversine(snappedPoints[i - 1], p)
      const diff = p.altitude - snappedPoints[i - 1].altitude
      if (diff > 0) elevGain += diff
    }
    return { distanceM: Math.round(distanceM), altitudeM: Math.round(p.altitude) }
  })

  const summaryList = feature.properties.extras?.surface?.summary ?? []
  const surfaces: Surface[] = summaryList.map(s => ({
    type: SURFACE_TYPES[s.value] ?? 'unknown',
    percent: Math.round((s.distance / (distanceM || 1)) * 100),
  }))

  return { snappedPoints, distanceM, elevGain, surfaces, elevationProfile }
}

// ── Guidage virage par virage ────────────────────────────────────
// Type de manœuvre ORS → libellé court FR.
const MANEUVER_FR: Record<number, string> = {
  0: 'Tournez à gauche', 1: 'Tournez à droite',
  2: 'Tournez fortement à gauche', 3: 'Tournez fortement à droite',
  4: 'Tournez légèrement à gauche', 5: 'Tournez légèrement à droite',
  6: 'Continuez tout droit', 7: 'Au rond-point', 8: 'Au rond-point',
  9: 'Demi-tour', 10: 'Arrivée', 11: 'Départ', 12: 'Restez à gauche', 13: 'Restez à droite',
}

export interface NavStep { lat: number; lng: number; instruction: string; type: number; distanceM: number }
export interface NavRoute { coords: SnappedPoint[]; steps: NavStep[]; distanceM: number; elevGain: number }

// Récupère la géométrie + les étapes de navigation (manœuvres) pour un parcours.
export async function navigationRoute(waypoints: Waypoint[], sport: string): Promise<NavRoute> {
  if (!ORS_KEY) throw new Error('NEXT_PUBLIC_ORS_KEY not configured')
  const profile = ORS_PROFILES[sport] ?? 'foot-hiking'
  const res = await fetch(
    `https://api.openrouteservice.org/v2/directions/${profile}/geojson`,
    {
      method: 'POST',
      headers: { 'Authorization': ORS_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ coordinates: waypoints.map(w => [w.lng, w.lat]), elevation: true, instructions: true, language: 'fr' }),
    },
  )
  if (!res.ok) throw new Error(`ORS ${res.status}`)
  const data = await res.json() as {
    features: { geometry: { coordinates: number[][] }; properties: { segments: { steps: { distance: number; type: number; instruction: string; way_points: number[] }[] }[] } }[]
  }
  const feature = data.features[0]
  const coords: SnappedPoint[] = feature.geometry.coordinates.map(([lng, lat, alt]) => ({ lat, lng, altitude: alt ?? 0 }))
  let distanceM = 0, elevGain = 0
  for (let i = 1; i < coords.length; i++) {
    distanceM += haversine(coords[i - 1], coords[i])
    const d = coords[i].altitude - coords[i - 1].altitude
    if (d > 0) elevGain += d
  }
  const steps: NavStep[] = []
  for (const seg of feature.properties.segments ?? []) {
    for (const st of seg.steps ?? []) {
      const idx = st.way_points?.[0] ?? 0
      const c = coords[idx]
      if (!c) continue
      steps.push({ lat: c.lat, lng: c.lng, instruction: st.instruction || MANEUVER_FR[st.type] || 'Continuez', type: st.type, distanceM: st.distance })
    }
  }
  return { coords, steps, distanceM, elevGain }
}
