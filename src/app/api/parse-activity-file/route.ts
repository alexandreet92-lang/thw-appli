export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'

// ─── Types ────────────────────────────────────────────────────────────────────
export interface ParsedActivity {
  name: string | null
  date: string | null            // YYYY-MM-DD
  duration_seconds: number | null
  distance_km: number | null
  elevation_gain_m: number | null
  altitude_max_m: number | null
  watts_avg: number | null
  watts_np: number | null
  hr_avg: number | null
  hr_max: number | null
  cadence_avg: number | null
  speed_avg_kmh: number | null
  calories: number | null
  temp_celsius: number | null
  tss: number | null
  if_score: number | null
  has_power: boolean
  source: 'gpx' | 'fit'
}

// ─── FIT PARSER (pure TypeScript, no dependencies) ───────────────────────────
// Implements Garmin FIT Protocol — parses Session (global 18) and Record (global 20) messages

const FIT_EPOCH_OFFSET = 631065600 // seconds from Unix epoch to FIT epoch (Jan 1 1990)

interface FieldDef {
  fieldNum: number
  size: number
  baseType: number
  globalMsgNum: number
  isLittleEndian: boolean
}

interface LocalTypeDef {
  globalMsgNum: number
  isLittleEndian: boolean
  fields: FieldDef[]
}

// FIT base type invalid sentinel values
const INVALID: Record<number, number> = {
  0x00: 0xFF, 0x01: 0x7F, 0x02: 0xFF,
  0x83: 0x7FFF, 0x84: 0xFFFF,
  0x85: 0x7FFFFFFF, 0x86: 0xFFFFFFFF,
}

// Session message (global 18) field numbers → names
const SESSION_FIELDS: Record<number, string> = {
  2:   'start_time',            // uint32 FIT timestamp
  7:   'total_elapsed_time',    // uint32 / 1000 = seconds
  8:   'total_timer_time',      // uint32 / 1000 = seconds
  9:   'total_distance',        // uint32 / 100 = meters
  11:  'total_calories',        // uint16 kcal
  14:  'avg_speed',             // uint16 / 1000 = m/s
  16:  'avg_heart_rate',        // uint8 bpm
  17:  'max_heart_rate',        // uint8 bpm
  18:  'avg_cadence',           // uint8 rpm
  20:  'avg_power',             // uint16 watts
  22:  'total_ascent',          // uint16 meters
  34:  'normalized_power',      // uint16 watts (Garmin extension)
  35:  'training_stress_score', // uint16 / 10 = TSS
  36:  'intensity_factor',      // uint16 / 1000 = IF
  57:  'avg_temperature',       // sint8 °C
  253: 'timestamp',             // uint32 FIT timestamp
}

function isSignedType(bt: number): boolean {
  return bt === 0x01 || bt === 0x83 || bt === 0x85 || bt === 0x8E
}

function readInt(view: DataView, offset: number, size: number, le: boolean, signed: boolean): number {
  if (signed) {
    if (size === 1) return view.getInt8(offset)
    if (size === 2) return view.getInt16(offset, le)
    if (size === 4) return view.getInt32(offset, le)
  } else {
    if (size === 1) return view.getUint8(offset)
    if (size === 2) return view.getUint16(offset, le)
    if (size === 4) return view.getUint32(offset, le)
  }
  return 0
}

function calcNP(powers: number[]): number {
  if (powers.length < 30) {
    return Math.round(powers.reduce((s, v) => s + v, 0) / powers.length)
  }
  const rolling: number[] = []
  for (let i = 29; i < powers.length; i++) {
    let sum = 0
    for (let j = i - 29; j <= i; j++) sum += powers[j]
    rolling.push(sum / 30)
  }
  const mean4 = rolling.reduce((s, v) => s + Math.pow(v, 4), 0) / rolling.length
  return Math.round(Math.pow(mean4, 0.25))
}

function parseFitBuffer(buffer: ArrayBuffer): ParsedActivity {
  const view  = new DataView(buffer)
  const bytes = new Uint8Array(buffer)

  if (bytes.length < 12) throw new Error('Fichier FIT trop court')

  const headerSize = view.getUint8(0)
  const dataSize   = view.getUint32(4, true)

  if (String.fromCharCode(bytes[8], bytes[9], bytes[10], bytes[11]) !== '.FIT') {
    throw new Error('Signature .FIT introuvable — ce fichier n\'est pas un fichier FIT valide')
  }

  let offset = headerSize
  const endOffset = headerSize + dataSize

  const localDefs    = new Map<number, LocalTypeDef>()
  const sessionData  = new Map<string, number>()
  const powerStream: number[] = []
  const altitudes:   number[] = []

  while (offset < endOffset && offset < bytes.length) {
    if (offset >= bytes.length) break
    const recHeader = view.getUint8(offset); offset++

    // Compressed timestamp header (bit 7)
    if (recHeader & 0x80) {
      const lt  = (recHeader >> 5) & 0x03
      const def = localDefs.get(lt)
      if (def) offset += def.fields.reduce((s, f) => s + f.size, 0)
      continue
    }

    const isDef      = (recHeader & 0x40) !== 0
    const hasDevFlds = (recHeader & 0x20) !== 0
    const lt         = recHeader & 0x0F

    if (isDef) {
      if (offset + 5 > bytes.length) break
      offset++                              // reserved
      const arch    = view.getUint8(offset); offset++
      const le      = arch === 0
      const gMsgNum = view.getUint16(offset, true); offset += 2
      const nFields = view.getUint8(offset); offset++

      const fields: FieldDef[] = []
      for (let i = 0; i < nFields; i++) {
        if (offset + 3 > bytes.length) break
        const fn   = view.getUint8(offset); offset++
        const sz   = view.getUint8(offset); offset++
        const bt   = view.getUint8(offset) & 0x9F; offset++
        fields.push({ fieldNum: fn, size: sz, baseType: bt, globalMsgNum: gMsgNum, isLittleEndian: le })
      }

      if (hasDevFlds && offset < bytes.length) {
        const nDev = view.getUint8(offset); offset++
        offset += nDev * 3
      }

      localDefs.set(lt, { globalMsgNum: gMsgNum, isLittleEndian: le, fields })

    } else {
      const def = localDefs.get(lt)
      if (!def) { offset++; continue }
      const msgSize = def.fields.reduce((s, f) => s + f.size, 0)
      if (offset + msgSize > bytes.length + 4) break

      if (def.globalMsgNum === 18) {
        // Session summary
        let pos = offset
        for (const f of def.fields) {
          const name = SESSION_FIELDS[f.fieldNum]
          if (name) {
            const raw = readInt(view, pos, f.size, f.isLittleEndian, isSignedType(f.baseType))
            const inv = INVALID[f.baseType]
            if (inv === undefined || raw !== inv) sessionData.set(name, raw)
          }
          pos += f.size
        }
      } else if (def.globalMsgNum === 20) {
        // Per-second records
        let pos = offset
        for (const f of def.fields) {
          if (f.fieldNum === 7 && f.size <= 2) {
            const pw = view.getUint16(pos, f.isLittleEndian)
            if (pw > 0 && pw < 3000 && pw !== 0xFFFF) powerStream.push(pw)
          }
          if ((f.fieldNum === 2 || f.fieldNum === 40) && f.size >= 2) {
            const raw = f.size === 4
              ? view.getUint32(pos, f.isLittleEndian)
              : view.getUint16(pos, f.isLittleEndian)
            if (raw !== 0xFFFF && raw !== 0xFFFFFFFF) altitudes.push(raw / 5 - 500)
          }
          pos += f.size
        }
      }

      offset += msgSize
    }
  }

  // Build result
  const startTime = sessionData.get('start_time') ?? sessionData.get('timestamp')
  const elapsed   = sessionData.get('total_elapsed_time')   // ×1000
  const dist      = sessionData.get('total_distance')       // ×100 = cm
  const ascent    = sessionData.get('total_ascent')
  const cals      = sessionData.get('total_calories')
  const avgHR     = sessionData.get('avg_heart_rate')
  const maxHR     = sessionData.get('max_heart_rate')
  const avgCad    = sessionData.get('avg_cadence')
  const avgSpd    = sessionData.get('avg_speed')            // ×1000 = m/s
  const avgPwr    = sessionData.get('avg_power')
  let   np        = sessionData.get('normalized_power')
  const rawTSS    = sessionData.get('training_stress_score')
  const rawIF     = sessionData.get('intensity_factor')
  const temp      = sessionData.get('avg_temperature')

  if (!np && powerStream.length > 0) np = calcNP(powerStream)

  let elevGain = (ascent && ascent > 0 && ascent < 50000) ? ascent : null
  if (!elevGain && altitudes.length > 1) {
    let g = 0
    for (let i = 1; i < altitudes.length; i++) {
      const d = altitudes[i] - altitudes[i - 1]
      if (d > 0.5) g += d
    }
    if (g > 0) elevGain = Math.round(g)
  }

  return {
    name: null,
    date: startTime ? new Date((startTime + FIT_EPOCH_OFFSET) * 1000).toISOString().slice(0, 10) : null,
    duration_seconds: elapsed ? Math.round(elapsed / 1000) : null,
    distance_km: dist && dist > 0 ? +(dist / 100000).toFixed(2) : null,
    elevation_gain_m: elevGain,
    altitude_max_m: altitudes.length > 0 ? Math.round(Math.max(...altitudes)) : null,
    watts_avg: (avgPwr && avgPwr > 0 && avgPwr < 3000) ? avgPwr : null,
    watts_np: (np && np > 0 && np < 3000) ? np : null,
    hr_avg: (avgHR && avgHR > 30 && avgHR < 250) ? avgHR : null,
    hr_max: (maxHR && maxHR > 30 && maxHR < 250) ? maxHR : null,
    cadence_avg: (avgCad && avgCad > 0 && avgCad < 200) ? avgCad : null,
    speed_avg_kmh: (avgSpd && avgSpd > 0) ? +((avgSpd / 1000) * 3.6).toFixed(1) : null,
    calories: (cals && cals > 0 && cals < 50000) ? cals : null,
    temp_celsius: (temp !== undefined && temp > -60 && temp < 60) ? temp : null,
    tss: rawTSS && rawTSS > 0 ? +(rawTSS / 10).toFixed(1) : null,
    if_score: rawIF && rawIF > 0 ? +(rawIF / 1000).toFixed(3) : null,
    has_power: (avgPwr != null && avgPwr > 0) || powerStream.length > 0,
    source: 'fit',
  }
}

// ─── GPX PARSER (regex-based, Node.js compatible) ────────────────────────────
interface GPXPoint {
  lat: number; lon: number; ele: number
  time: Date | null
  power: number | null; hr: number | null; cad: number | null; temp: number | null
}

function parseGPXBuffer(text: string): ParsedActivity {
  // Extract metadata name
  const nameMatch = text.match(/<name>([^<]*)<\/name>/)
  const actName   = nameMatch ? nameMatch[1].trim() : null

  // Parse trackpoints
  const points: GPXPoint[] = []
  const trkptRx = /<trkpt\s[^>]*lat="([^"]+)"[^>]*lon="([^"]+)"[^>]*>([\s\S]*?)<\/trkpt>/gi
  let match: RegExpExecArray | null

  while ((match = trkptRx.exec(text)) !== null) {
    const lat = parseFloat(match[1])
    const lon = parseFloat(match[2])
    const inner = match[3]

    const eleM    = inner.match(/<ele>([^<]+)<\/ele>/)
    const timeM   = inner.match(/<time>([^<]+)<\/time>/)
    const ele     = eleM   ? parseFloat(eleM[1])   : 0
    const time    = timeM  ? new Date(timeM[1])     : null

    // Power — standard <power> or ns-prefixed
    const pwrM = inner.match(/<(?:[a-z0-9_]+:)?power>(\d+)<\/(?:[a-z0-9_]+:)?power>/i)
    const power = pwrM ? parseInt(pwrM[1]) : null

    // Garmin TrackPointExtension: hr, cad, atemp
    const hrM   = inner.match(/<(?:[a-z0-9_]+:)?(?:hr|heartrate)>(\d+)<\/(?:[a-z0-9_]+:)?(?:hr|heartrate)>/i)
    const cadM  = inner.match(/<(?:[a-z0-9_]+:)?(?:cad|cadence|runcadence)>(\d+)<\/(?:[a-z0-9_]+:)?(?:cad|cadence|runcadence)>/i)
    const tmpM  = inner.match(/<(?:[a-z0-9_]+:)?(?:atemp|temperature)>([-\d.]+)<\/(?:[a-z0-9_]+:)?(?:atemp|temperature)>/i)

    points.push({
      lat, lon, ele, time,
      power: power && power > 0 && power < 3000 ? power : null,
      hr:    hrM  ? parseInt(hrM[1])  : null,
      cad:   cadM ? parseInt(cadM[1]) : null,
      temp:  tmpM ? parseFloat(tmpM[1]) : null,
    })
  }

  if (points.length < 2) throw new Error('Pas assez de points GPS dans ce fichier GPX')

  // Calculate totals
  let totalDist = 0, elevGain = 0
  const altitudes: number[] = [], powers: number[] = [], hrs: number[] = []
  const cads: number[] = [], temps: number[] = []

  for (let i = 0; i < points.length; i++) {
    const p = points[i]
    if (p.ele) altitudes.push(p.ele)
    if (p.power != null) powers.push(p.power)
    if (p.hr != null) hrs.push(p.hr)
    if (p.cad != null) cads.push(p.cad)
    if (p.temp != null) temps.push(p.temp)

    if (i > 0) {
      const prev = points[i - 1]
      totalDist += haversineKm(prev.lat, prev.lon, p.lat, p.lon)
      const dEle = p.ele - prev.ele
      if (dEle > 0.5) elevGain += dEle
    }
  }

  const startTime = points[0].time
  const endTime   = points[points.length - 1].time
  const durSec    = startTime && endTime ? Math.round((endTime.getTime() - startTime.getTime()) / 1000) : null

  const avg = (arr: number[]) => arr.length ? arr.reduce((s, v) => s + v, 0) / arr.length : null
  const avgPwr  = powers.length  > 0 ? Math.round(avg(powers)!)  : null
  const npPwr   = powers.length >= 30 ? calcNP(powers) : (powers.length > 0 ? avgPwr : null)
  const avgHR   = hrs.length    > 0 ? Math.round(avg(hrs)!)    : null
  const maxHR   = hrs.length    > 0 ? Math.round(Math.max(...hrs)) : null
  const avgCad  = cads.length   > 0 ? Math.round(avg(cads)!)   : null
  const avgTemp = temps.length  > 0 ? +avg(temps)!.toFixed(1)  : null
  const spdKmh  = totalDist > 0 && durSec && durSec > 0
    ? +((totalDist / (durSec / 3600))).toFixed(1) : null

  return {
    name: actName,
    date: startTime ? startTime.toISOString().slice(0, 10) : null,
    duration_seconds: durSec,
    distance_km: totalDist > 0.01 ? +totalDist.toFixed(2) : null,
    elevation_gain_m: elevGain > 0 ? Math.round(elevGain) : null,
    altitude_max_m: altitudes.length > 0 ? Math.round(Math.max(...altitudes)) : null,
    watts_avg: avgPwr,
    watts_np: npPwr,
    hr_avg: avgHR,
    hr_max: maxHR,
    cadence_avg: avgCad,
    speed_avg_kmh: spdKmh,
    calories: null,
    temp_celsius: avgTemp,
    tss: null,
    if_score: null,
    has_power: powers.length > 0,
    source: 'gpx',
  }
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R    = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// ─── POST handler ─────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    if (!file) return NextResponse.json({ error: 'Aucun fichier fourni' }, { status: 400 })

    const fileName = file.name.toLowerCase()

    if (fileName.endsWith('.fit')) {
      const buf = await file.arrayBuffer()
      try {
        const result = parseFitBuffer(buf)
        return NextResponse.json({ activity: result })
      } catch (e: any) {
        return NextResponse.json({ error: `FIT: ${e.message}` }, { status: 422 })
      }
    }

    if (fileName.endsWith('.gpx')) {
      const text = await file.text()
      try {
        const result = parseGPXBuffer(text)
        return NextResponse.json({ activity: result })
      } catch (e: any) {
        return NextResponse.json({ error: `GPX: ${e.message}` }, { status: 422 })
      }
    }

    return NextResponse.json({ error: 'Format non supporté (.gpx ou .fit uniquement)' }, { status: 400 })
  } catch (err) {
    console.error('[parse-activity-file]', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
