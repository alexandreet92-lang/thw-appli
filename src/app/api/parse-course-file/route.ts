export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'

interface TrackPoint {
  lat: number
  lon: number
  ele: number      // altitude en mètres
  dist_km: number  // distance cumulée depuis le départ
}

interface Segment {
  start_km: number
  end_km: number
  distance_km: number
  ele_start: number
  ele_end: number
  denivele: number
  pente_moyenne_pct: number
  type: 'montee' | 'descente' | 'plat'
  description: string
  categorie?: 'HC' | '1' | '2' | '3' | '4' | null
}

interface MajorClimb {
  start_km: number
  end_km: number
  distance_km: number
  denivele: number
  pente_moyenne_pct: number
  pente_max_pct: number
  altitude_max: number
  categorie: 'HC' | '1' | '2' | '3' | '4'
}

interface CourseProfile {
  total_distance_km: number
  total_denivele_pos: number
  total_denivele_neg: number
  altitude_min: number
  altitude_max: number
  segments: Segment[]
  major_climbs: MajorClimb[]
  elevation_profile: { dist_km: number; ele: number }[]
}

// ── Haversine ────────────────────────────────────────────────────────────
function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// ── Parsers GPX / TCX / KML ──────────────────────────────────────────────
function parseGPX(xml: string): TrackPoint[] {
  const points: TrackPoint[] = []
  const trkptRegex = /<trkpt\s+lat="([^"]+)"\s+lon="([^"]+)"[^>]*>([\s\S]*?)<\/trkpt>/gi
  let match
  let cumulDist = 0
  let prevLat = 0, prevLon = 0

  while ((match = trkptRegex.exec(xml)) !== null) {
    const lat = parseFloat(match[1])
    const lon = parseFloat(match[2])
    const eleMatch = match[3].match(/<ele>([^<]+)<\/ele>/)
    const ele = eleMatch ? parseFloat(eleMatch[1]) : 0

    if (points.length > 0) cumulDist += haversine(prevLat, prevLon, lat, lon)
    points.push({ lat, lon, ele, dist_km: cumulDist })
    prevLat = lat
    prevLon = lon
  }
  return points
}

function parseTCX(xml: string): TrackPoint[] {
  const points: TrackPoint[] = []
  const tpRegex = /<Trackpoint>([\s\S]*?)<\/Trackpoint>/gi
  let match
  let cumulDist = 0
  let prevLat = 0, prevLon = 0

  while ((match = tpRegex.exec(xml)) !== null) {
    const block = match[1]
    const latMatch = block.match(/<LatitudeDegrees>([^<]+)<\/LatitudeDegrees>/)
    const lonMatch = block.match(/<LongitudeDegrees>([^<]+)<\/LongitudeDegrees>/)
    const eleMatch = block.match(/<AltitudeMeters>([^<]+)<\/AltitudeMeters>/)
    if (!latMatch || !lonMatch) continue

    const lat = parseFloat(latMatch[1])
    const lon = parseFloat(lonMatch[1])
    const ele = eleMatch ? parseFloat(eleMatch[1]) : 0

    if (points.length > 0) cumulDist += haversine(prevLat, prevLon, lat, lon)
    points.push({ lat, lon, ele, dist_km: cumulDist })
    prevLat = lat
    prevLon = lon
  }
  return points
}

function parseKML(xml: string): TrackPoint[] {
  const points: TrackPoint[] = []
  const coordMatch = xml.match(/<coordinates>([\s\S]*?)<\/coordinates>/)
  if (!coordMatch) return points

  const coords = coordMatch[1].trim().split(/\s+/)
  let cumulDist = 0
  let prevLat = 0, prevLon = 0

  for (const c of coords) {
    const parts = c.split(',')
    if (parts.length < 2) continue
    const lon = parseFloat(parts[0])
    const lat = parseFloat(parts[1])
    const ele = parts.length >= 3 ? parseFloat(parts[2]) : 0

    if (points.length > 0) cumulDist += haversine(prevLat, prevLon, lat, lon)
    points.push({ lat, lon, ele, dist_km: cumulDist })
    prevLat = lat
    prevLon = lon
  }
  return points
}

// ── Segmentation adaptative ──────────────────────────────────────────────
function segmentCourse(points: TrackPoint[]): Segment[] {
  if (points.length < 10) return []

  const totalDist = points[points.length - 1].dist_km

  // Taille minimale des segments adaptée à la distance totale
  const minSegmentKm = totalDist > 100 ? 3.0 : totalDist > 50 ? 2.0 : totalDist > 20 ? 1.0 : 0.5

  // Seuil de pente : plus strict sur les longs parcours pour éviter les faux positifs
  const slopeThreshold = totalDist > 50 ? 2.5 : 1.5

  const segments: Segment[] = []
  let segStart = 0

  // Lissage altimétrique (moyenne glissante 20 points)
  const smoothed = points.map((p, i) => {
    const window = points.slice(Math.max(0, i - 10), Math.min(points.length, i + 11))
    return { ...p, ele: window.reduce((s, w) => s + w.ele, 0) / window.length }
  })

  type PointType = 'montee' | 'descente' | 'plat'

  function getType(i: number): PointType {
    if (i === 0) return 'plat'
    const dDist = (smoothed[i].dist_km - smoothed[i - 1].dist_km) * 1000
    if (dDist < 1) return 'plat'
    const pente = ((smoothed[i].ele - smoothed[i - 1].ele) / dDist) * 100
    if (pente > slopeThreshold) return 'montee'
    if (pente < -slopeThreshold) return 'descente'
    return 'plat'
  }

  let currentType = getType(1)

  function pushSegment(startIdx: number, endIdx: number, type: PointType) {
    const startP = smoothed[startIdx]
    const endP = smoothed[endIdx]
    const distKm = endP.dist_km - startP.dist_km
    const denivele = endP.ele - startP.ele
    const pentePct = distKm > 0 ? (denivele / (distKm * 1000)) * 100 : 0
    let description = ''
    if (type === 'montee') {
      description = `Montée ${distKm.toFixed(1)}km à ${Math.abs(pentePct).toFixed(1)}% (${Math.round(startP.ele)}m → ${Math.round(endP.ele)}m)`
    } else if (type === 'descente') {
      description = `Descente ${distKm.toFixed(1)}km à ${Math.abs(pentePct).toFixed(1)}% (${Math.round(startP.ele)}m → ${Math.round(endP.ele)}m)`
    } else {
      description = `Plat/faux-plat ${distKm.toFixed(1)}km (${Math.round(startP.ele)}m → ${Math.round(endP.ele)}m)`
    }
    segments.push({
      start_km: Math.round(startP.dist_km * 10) / 10,
      end_km: Math.round(endP.dist_km * 10) / 10,
      distance_km: Math.round(distKm * 10) / 10,
      ele_start: Math.round(startP.ele),
      ele_end: Math.round(endP.ele),
      denivele: Math.round(denivele),
      pente_moyenne_pct: Math.round(pentePct * 10) / 10,
      type,
      description,
    })
  }

  for (let i = 2; i < smoothed.length; i++) {
    const type = getType(i)
    const segDistKm = smoothed[i].dist_km - smoothed[segStart].dist_km
    if (type !== currentType && segDistKm >= minSegmentKm) {
      pushSegment(segStart, i - 1, currentType)
      segStart = i - 1
      currentType = type
    }
  }
  if (segStart < smoothed.length - 1) {
    pushSegment(segStart, smoothed.length - 1, currentType)
  }

  return segments
}

// ── Fusion segments consécutifs de même type ─────────────────────────────
function mergeConsecutiveSegments(segments: Segment[]): Segment[] {
  if (segments.length <= 1) return segments
  const merged: Segment[] = [{ ...segments[0] }]
  for (let i = 1; i < segments.length; i++) {
    const prev = merged[merged.length - 1]
    const curr = segments[i]
    if (prev.type === curr.type) {
      const distKm = curr.end_km - prev.start_km
      const denivele = curr.ele_end - prev.ele_start
      const pentePct = distKm > 0 ? (denivele / (distKm * 1000)) * 100 : 0
      merged[merged.length - 1] = {
        start_km: prev.start_km,
        end_km: curr.end_km,
        distance_km: Math.round(distKm * 10) / 10,
        ele_start: prev.ele_start,
        ele_end: curr.ele_end,
        denivele: Math.round(denivele),
        pente_moyenne_pct: Math.round(pentePct * 10) / 10,
        type: prev.type,
        description: '',
      }
    } else {
      merged.push({ ...curr })
    }
  }
  // Recalculer descriptions
  return merged.map(s => ({
    ...s,
    description: s.type === 'montee'
      ? `Montée ${s.distance_km}km à ${Math.abs(s.pente_moyenne_pct).toFixed(1)}% (${s.ele_start}m → ${s.ele_end}m)`
      : s.type === 'descente'
        ? `Descente ${s.distance_km}km à ${Math.abs(s.pente_moyenne_pct).toFixed(1)}% (${s.ele_start}m → ${s.ele_end}m)`
        : `Plat ${s.distance_km}km (${s.ele_start}m → ${s.ele_end}m)`,
  }))
}

// ── Catégorisation des montées ────────────────────────────────────────────
function classifyClimb(distKm: number, penteMoy: number, denivele: number): 'HC' | '1' | '2' | '3' | '4' | null {
  if (distKm < 1 || penteMoy < 3 || denivele < 80) return null
  const score = distKm * penteMoy * penteMoy
  if (score > 800 || denivele > 1000 || (distKm > 15 && penteMoy > 7)) return 'HC'
  if (score > 400 || denivele > 600 || (distKm > 10 && penteMoy > 6)) return '1'
  if (score > 150 || denivele > 400 || (distKm > 5 && penteMoy > 5)) return '2'
  if (score > 50 || denivele > 200 || (distKm > 3 && penteMoy > 4)) return '3'
  if (denivele > 80) return '4'
  return null
}

function identifyMajorClimbs(segments: Segment[], points: TrackPoint[]): MajorClimb[] {
  const climbs: MajorClimb[] = []
  let climbStart: number | null = null

  const processClimb = (startIdx: number, endIdx: number) => {
    const startSeg = segments[startIdx]
    const endSeg = segments[endIdx]
    const distKm = endSeg.end_km - startSeg.start_km
    const denivele = endSeg.ele_end - startSeg.ele_start
    const penteMoy = distKm > 0 ? (denivele / (distKm * 1000)) * 100 : 0

    // Calculer pente max sur les points bruts
    let penteMax = 0
    const startIdx2 = points.findIndex(p => p.dist_km >= startSeg.start_km)
    const endIdx2 = points.findIndex(p => p.dist_km >= endSeg.end_km)
    if (startIdx2 >= 0 && endIdx2 > startIdx2) {
      for (let j = startIdx2 + 1; j <= Math.min(endIdx2, points.length - 1); j++) {
        const d = (points[j].dist_km - points[j - 1].dist_km) * 1000
        if (d > 10) {
          const p = ((points[j].ele - points[j - 1].ele) / d) * 100
          if (p > penteMax) penteMax = p
        }
      }
    }

    const cat = classifyClimb(distKm, penteMoy, denivele)
    if (cat) {
      climbs.push({
        start_km: startSeg.start_km,
        end_km: endSeg.end_km,
        distance_km: Math.round(distKm * 10) / 10,
        denivele: Math.round(denivele),
        pente_moyenne_pct: Math.round(penteMoy * 10) / 10,
        pente_max_pct: Math.round(penteMax * 10) / 10,
        altitude_max: Math.round(endSeg.ele_end),
        categorie: cat,
      })
    }
  }

  for (let i = 0; i < segments.length; i++) {
    if (segments[i].type === 'montee') {
      if (climbStart === null) climbStart = i
    } else {
      if (climbStart !== null) {
        processClimb(climbStart, i - 1)
        climbStart = null
      }
    }
  }
  // Parcours qui finit en montée
  if (climbStart !== null) processClimb(climbStart, segments.length - 1)

  return climbs
}

// ── POST handler ─────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    if (!file) return NextResponse.json({ error: 'Aucun fichier fourni' }, { status: 400 })

    const fileName = file.name.toLowerCase()
    const content = await file.text()

    let points: TrackPoint[] = []

    if (fileName.endsWith('.gpx')) {
      points = parseGPX(content)
    } else if (fileName.endsWith('.tcx')) {
      points = parseTCX(content)
    } else if (fileName.endsWith('.kml')) {
      points = parseKML(content)
    } else if (fileName.endsWith('.fit')) {
      return NextResponse.json(
        { error: "Le format .fit n'est pas encore supporté. Exporte ton parcours en GPX ou TCX depuis Garmin Connect ou Strava." },
        { status: 400 }
      )
    } else {
      return NextResponse.json(
        { error: 'Format non supporté. Formats acceptés : .gpx, .tcx, .kml' },
        { status: 400 }
      )
    }

    if (points.length < 10) {
      return NextResponse.json(
        { error: 'Fichier invalide ou trop peu de points GPS (minimum 10)' },
        { status: 400 }
      )
    }

    const totalDist = points[points.length - 1].dist_km
    let dPos = 0, dNeg = 0
    for (let i = 1; i < points.length; i++) {
      const dEle = points[i].ele - points[i - 1].ele
      if (dEle > 0) dPos += dEle
      else dNeg += Math.abs(dEle)
    }

    const altitudes = points.map(p => p.ele)
    const rawSegments = segmentCourse(points)
    const segments = mergeConsecutiveSegments(rawSegments)
    const majorClimbs = identifyMajorClimbs(segments, points)

    // Profil altimétrique simplifié (100 points max)
    const step = Math.max(1, Math.floor(points.length / 100))
    const elevationProfile = points
      .filter((_, i) => i % step === 0)
      .map(p => ({ dist_km: Math.round(p.dist_km * 100) / 100, ele: Math.round(p.ele) }))

    const profile: CourseProfile = {
      total_distance_km: Math.round(totalDist * 100) / 100,
      total_denivele_pos: Math.round(dPos),
      total_denivele_neg: Math.round(dNeg),
      altitude_min: Math.round(Math.min(...altitudes)),
      altitude_max: Math.round(Math.max(...altitudes)),
      segments,
      major_climbs: majorClimbs,
      elevation_profile: elevationProfile,
    }

    return NextResponse.json({ profile })
  } catch (err) {
    console.error('[parse-course-file]', err)
    return NextResponse.json({ error: 'Erreur de parsing du fichier' }, { status: 500 })
  }
}
