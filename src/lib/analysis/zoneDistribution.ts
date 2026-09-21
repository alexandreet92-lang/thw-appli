// ══════════════════════════════════════════════════════════════════════════
// Répartition en zones calculée sur les VRAIS streams (Brique 3).
// Remplace l'estimation par l'IA : on classe chaque point de FC (ou de
// puissance pour le vélo) dans sa zone et on somme le temps réel par zone.
// Réutilise la même logique de parsing/temps que la page Activités
// (parseZoneText / calcTimeInZones), pour une répartition cohérente partout.
// ══════════════════════════════════════════════════════════════════════════

export const ZONE_COLORS = ['#9ca3af', '#22c55e', '#eab308', '#f97316', '#ef4444']

export interface ParsedZone { label: string; color: string; min: number; max: number }

export interface ZoneSlice { zone: string; pct: number; minutes: number; color: string }

export interface ZoneRowLite {
  z1_value?: string | null; z2_value?: string | null; z3_value?: string | null; z4_value?: string | null; z5_value?: string | null
  z1_label?: string | null; z2_label?: string | null; z3_label?: string | null; z4_label?: string | null; z5_label?: string | null
  ftp_watts?: number | null
}

export interface StreamsForZones {
  heartrate?: number[]
  watts?: number[]
  time?: number[]
}

// Parse un libellé de seuil de zone : "<120", ">175", "140-160".
export function parseZoneText(text: string | null | undefined): { min: number; max: number } {
  if (!text) return { min: 0, max: Infinity }
  const lt = text.match(/^[<＜](\d+)/)
  if (lt) return { min: 0, max: Number(lt[1]) }
  const gt = text.match(/^[>＞](\d+)/)
  if (gt) return { min: Number(gt[1]), max: Infinity }
  const range = text.match(/(\d+)\D+(\d+)/)
  if (range) return { min: Number(range[1]), max: Number(range[2]) }
  return { min: 0, max: Infinity }
}

function buildHrZones(row: ZoneRowLite): ParsedZone[] {
  return [
    { label: row.z1_label || 'Z1', color: ZONE_COLORS[0], ...parseZoneText(row.z1_value) },
    { label: row.z2_label || 'Z2', color: ZONE_COLORS[1], ...parseZoneText(row.z2_value) },
    { label: row.z3_label || 'Z3', color: ZONE_COLORS[2], ...parseZoneText(row.z3_value) },
    { label: row.z4_label || 'Z4', color: ZONE_COLORS[3], ...parseZoneText(row.z4_value) },
    { label: row.z5_label || 'Z5', color: ZONE_COLORS[4], ...parseZoneText(row.z5_value) },
  ]
}

// Zones de puissance à partir de la FTP (modèle % FTP, 5 zones).
function buildPowerZones(ftp: number): ParsedZone[] {
  const b = [0.55, 0.75, 0.90, 1.05].map(p => Math.round(ftp * p))
  return [
    { label: 'Z1', color: ZONE_COLORS[0], min: 0,     max: b[0] },
    { label: 'Z2', color: ZONE_COLORS[1], min: b[0],  max: b[1] },
    { label: 'Z3', color: ZONE_COLORS[2], min: b[1],  max: b[2] },
    { label: 'Z4', color: ZONE_COLORS[3], min: b[2],  max: b[3] },
    { label: 'Z5', color: ZONE_COLORS[4], min: b[3],  max: Infinity },
  ]
}

export function calcTimeInZones(data: number[], zones: ParsedZone[], sampleRateS = 1): number[] {
  const counts = zones.map(() => 0)
  for (const v of data) {
    if (!(v > 0)) continue
    for (let i = 0; i < zones.length; i++) {
      if (v >= zones[i].min && v <= zones[i].max) { counts[i]++; break }
    }
  }
  return counts.map(c => c * sampleRateS)
}

// Cadence d'échantillonnage moyenne (s/point) à partir du stream `time`.
function sampleRateOf(time: number[] | undefined, n: number): number {
  if (time && time.length > 1) {
    const span = time[time.length - 1] - time[0]
    if (span > 0 && n > 1) return span / (n - 1)
  }
  return 1
}

function hasHrZones(row: ZoneRowLite | null | undefined): boolean {
  return !!row && [row.z1_value, row.z2_value, row.z3_value, row.z4_value, row.z5_value].some(v => !!v && /\d/.test(v))
}

function isBike(sport: string): boolean {
  const s = sport.toLowerCase()
  return s.includes('bike') || s.includes('cycl') || s.includes('velo') || s.includes('vélo')
}

/**
 * Calcule la répartition en zones (Z1..Z5) depuis les vrais streams.
 * Vélo : préfère la puissance (FTP) ; sinon FC (zones configurées).
 * Renvoie null si aucune donnée exploitable (l'IA retombera sur son estimation).
 */
export function computeZoneDistribution(
  streams: StreamsForZones | null | undefined,
  zonesRow: ZoneRowLite | null | undefined,
  sport: string,
): ZoneSlice[] | null {
  if (!streams) return null

  let zones: ParsedZone[] | null = null
  let data: number[] | undefined

  const ftp = zonesRow?.ftp_watts ?? null
  if (isBike(sport) && streams.watts && streams.watts.length >= 10 && ftp && ftp > 0) {
    zones = buildPowerZones(ftp)
    data = streams.watts
  } else if (streams.heartrate && streams.heartrate.length >= 10 && hasHrZones(zonesRow)) {
    zones = buildHrZones(zonesRow!)
    data = streams.heartrate
  }

  if (!zones || !data) return null

  const rate = sampleRateOf(streams.time, data.length)
  const times = calcTimeInZones(data, zones, rate)
  const total = times.reduce((s, x) => s + x, 0)
  if (total <= 0) return null

  return zones.map((z, i) => ({
    zone: `Z${i + 1}`,
    pct: Math.round((times[i] / total) * 100),
    minutes: Math.round(times[i] / 60),
    color: z.color,
  }))
}
