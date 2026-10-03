// ══════════════════════════════════════════════════════════════════════════
// GATT — UUID standard + décodage des mesures BLE (fonctions pures, testables).
// Spécifications Bluetooth SIG (GATT Specification Supplement). Toutes les
// valeurs multi-octets sont little-endian.
//   · Heart Rate              0x180D / mesure 0x2A37
//   · Cycling Power           0x1818 / mesure 0x2A63
//   · Cycling Speed & Cadence 0x1816 / mesure 0x2A5B
//   · Running Speed & Cadence 0x1814 / mesure 0x2A53
//   · Fitness Machine (FTMS)  0x1826 / Indoor Bike Data 0x2AD2 (repli trainer)
// ══════════════════════════════════════════════════════════════════════════

/** UUID 16 bits → UUID 128 bits « base Bluetooth » (format attendu par le plugin). */
export function uuid16(n: number): string {
  return `0000${n.toString(16).padStart(4, '0')}-0000-1000-8000-00805f9b34fb`
}

export const GATT = {
  HR_SERVICE: uuid16(0x180d), HR_MEASUREMENT: uuid16(0x2a37),
  CP_SERVICE: uuid16(0x1818), CP_MEASUREMENT: uuid16(0x2a63),
  CSC_SERVICE: uuid16(0x1816), CSC_MEASUREMENT: uuid16(0x2a5b),
  RSC_SERVICE: uuid16(0x1814), RSC_MEASUREMENT: uuid16(0x2a53),
  FTMS_SERVICE: uuid16(0x1826), FTMS_INDOOR_BIKE: uuid16(0x2ad2),
} as const

/** Normalise un UUID (16 bits « 180d » ou 128 bits) en 128 bits minuscule. */
export function normUuid(u: string): string {
  const s = u.toLowerCase()
  if (/^[0-9a-f]{4}$/.test(s)) return uuid16(parseInt(s, 16))
  if (/^[0-9a-f]{8}$/.test(s)) return `${s}-0000-1000-8000-00805f9b34fb`
  return s
}

// ── Heart Rate Measurement (0x2A37) ──────────────────────────────────────
// flags u8 : bit0 = format FC (0 → u8, 1 → u16). Le reste (contact, énergie,
// RR) suit la FC et n'est pas utile ici.
export function parseHeartRate(dv: DataView): number | null {
  if (dv.byteLength < 2) return null
  const flags = dv.getUint8(0)
  if (flags & 0x01) return dv.byteLength >= 3 ? dv.getUint16(1, true) : null
  return dv.getUint8(1)
}

// ── Compteurs cumulés (roue / manivelle) ─────────────────────────────────
/** Relevé cumulatif : révolutions + horodatage d'événement (unité `tick`). */
export interface RevState { revs: number; time: number }

/** Delta d'un compteur non signé qui reboucle (16 ou 32 bits). */
function wrapDelta(cur: number, prev: number, bits: 16 | 32): number {
  const mod = bits === 16 ? 0x10000 : 0x100000000
  return (cur - prev + mod) % mod
}

/** Cadence (rpm) entre deux relevés de manivelle (temps en 1/1024 s, u16).
 *  null si aucun nouvel événement (manivelle immobile). */
export function crankRpm(prev: RevState, cur: RevState): number | null {
  const dRev = wrapDelta(cur.revs, prev.revs, 16)
  const dTime = wrapDelta(cur.time, prev.time, 16)
  if (dTime === 0) return null
  const rpm = (dRev * 1024 * 60) / dTime
  if (!Number.isFinite(rpm) || rpm < 0 || rpm > 250) return null
  return Math.round(rpm)
}

/** Vitesse (km/h) entre deux relevés de roue. `ticksPerSec` : 1024 pour CSC,
 *  2048 pour Cycling Power. Révolutions u32, temps u16. */
export function wheelKmh(prev: RevState, cur: RevState, circumferenceM: number, ticksPerSec: number): number | null {
  const dRev = wrapDelta(cur.revs, prev.revs, 32)
  const dTime = wrapDelta(cur.time, prev.time, 16)
  if (dTime === 0) return null
  const ms = (dRev * circumferenceM) / (dTime / ticksPerSec)
  const kmh = ms * 3.6
  if (!Number.isFinite(kmh) || kmh < 0 || kmh > 120) return null
  return Math.round(kmh * 10) / 10
}

// ── Cycling Power Measurement (0x2A63) ───────────────────────────────────
// flags u16 · puissance instantanée s16 (W) · champs optionnels dans l'ordre :
//  bit0 Pedal Power Balance (u8) · bit2 Accumulated Torque (u16) ·
//  bit4 Wheel Revolution Data (u32 revs + u16 temps 1/2048 s) ·
//  bit5 Crank Revolution Data (u16 revs + u16 temps 1/1024 s).
export interface CyclingPowerReading { power: number; wheel?: RevState; crank?: RevState }

export function parseCyclingPower(dv: DataView): CyclingPowerReading | null {
  if (dv.byteLength < 4) return null
  const flags = dv.getUint16(0, true)
  const power = dv.getInt16(2, true)
  let off = 4
  if (flags & 0x01) off += 1
  if (flags & 0x04) off += 2
  const out: CyclingPowerReading = { power }
  if (flags & 0x10) {
    if (dv.byteLength >= off + 6) out.wheel = { revs: dv.getUint32(off, true), time: dv.getUint16(off + 4, true) }
    off += 6
  }
  if (flags & 0x20 && dv.byteLength >= off + 4) {
    out.crank = { revs: dv.getUint16(off, true), time: dv.getUint16(off + 2, true) }
  }
  return out
}

// ── CSC Measurement (0x2A5B) ─────────────────────────────────────────────
// flags u8 · bit0 Wheel Revolution Data (u32 revs + u16 temps 1/1024 s) ·
// bit1 Crank Revolution Data (u16 revs + u16 temps 1/1024 s).
export interface CscReading { wheel?: RevState; crank?: RevState }

export function parseCsc(dv: DataView): CscReading {
  if (dv.byteLength < 1) return {}
  const flags = dv.getUint8(0)
  let off = 1
  const out: CscReading = {}
  if (flags & 0x01) {
    if (dv.byteLength >= off + 6) out.wheel = { revs: dv.getUint32(off, true), time: dv.getUint16(off + 4, true) }
    off += 6
  }
  if (flags & 0x02 && dv.byteLength >= off + 4) {
    out.crank = { revs: dv.getUint16(off, true), time: dv.getUint16(off + 2, true) }
  }
  return out
}

// ── RSC Measurement (0x2A53) ─────────────────────────────────────────────
// flags u8 · vitesse instantanée u16 (1/256 m/s) · cadence instantanée u8
// (1/min, valeur brute du capteur) · [bit0 longueur de foulée u16] ·
// [bit1 distance totale u32].
export interface RscReading { speedKmh: number; cadence: number }

export function parseRsc(dv: DataView): RscReading | null {
  if (dv.byteLength < 4) return null
  const speedMs = dv.getUint16(1, true) / 256
  const cadence = dv.getUint8(3)
  return { speedKmh: Math.round(speedMs * 3.6 * 10) / 10, cadence }
}

// ── FTMS Indoor Bike Data (0x2AD2) — repli home trainer ──────────────────
// Attention : bit0 = « More Data » → vitesse instantanée ABSENTE quand il vaut 1.
export interface IndoorBikeReading { power?: number; cadence?: number; speedKmh?: number }

export function parseIndoorBike(dv: DataView): IndoorBikeReading {
  if (dv.byteLength < 2) return {}
  const flags = dv.getUint16(0, true)
  let off = 2
  const out: IndoorBikeReading = {}
  const has = (n: number) => dv.byteLength >= off + n
  if (!(flags & 0x0001)) { if (has(2)) out.speedKmh = dv.getUint16(off, true) / 100; off += 2 }
  if (flags & 0x0002) off += 2
  if (flags & 0x0004) { if (has(2)) out.cadence = Math.round(dv.getUint16(off, true) / 2); off += 2 }
  if (flags & 0x0008) off += 2
  if (flags & 0x0010) off += 3
  if (flags & 0x0020) off += 2
  if (flags & 0x0040) { if (has(2)) out.power = dv.getInt16(off, true); off += 2 }
  return out
}
