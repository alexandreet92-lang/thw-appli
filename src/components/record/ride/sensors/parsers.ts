// ══════════════════════════════════════════════════════════════════
// parsers — décodage BAS NIVEAU des caractéristiques BLE (binaire pur).
// Isolé volontairement : fonctions pures, sans état ni React, testables.
// Toutes les valeurs multi-octets sont little-endian (convention BLE GATT).
// ══════════════════════════════════════════════════════════════════

/** État de manivelle (revolutions cumulées + horodatage 1/1024 s) — sert au
 *  calcul de cadence, qui exige DEUX relevés (delta revs / delta temps). */
export interface CrankState { revs: number; time: number }

/** Heart Rate Measurement (0x2A37). bit0 des flags → format bpm (u16 sinon u8). */
export function parseHeartRate(dv: DataView): number | null {
  if (dv.byteLength < 2) return null
  const flags = dv.getUint8(0)
  const bpm = (flags & 0x01) ? dv.getUint16(1, true) : dv.getUint8(1)
  return bpm
}

export interface CyclingPowerReading { power: number; crank?: CrankState }

/** Cycling Power Measurement (0x2A63) : flags(u16) puis puissance instantanée
 *  (s16, W). Données de manivelle présentes si bit5 des flags ; leur offset
 *  dépend des champs optionnels précédents. */
export function parseCyclingPower(dv: DataView): CyclingPowerReading {
  const flags = dv.getUint16(0, true)
  const power = dv.getInt16(2, true)
  let off = 4
  if (flags & 0x01) off += 1                 // Pedal Power Balance (u8)
  if (flags & 0x04) off += 2                 // Accumulated Torque (u16)
  if (flags & 0x10) off += 6                 // Wheel Revolution Data (u32 + u16)
  let crank: CrankState | undefined
  if (flags & 0x20 && dv.byteLength >= off + 4) {
    crank = { revs: dv.getUint16(off, true), time: dv.getUint16(off + 2, true) }
  }
  return { power, crank }
}

export interface IndoorBikeReading { power?: number; cadence?: number; speed?: number }

/** FTMS Indoor Bike Data (0x2AD2). Ordre des champs figé par la spec, chacun
 *  conditionné par un bit de flags (u16). Attention : bit0 = « More Data » et
 *  signifie que la vitesse instantanée est ABSENTE quand il vaut 1. */
export function parseIndoorBikeData(dv: DataView): IndoorBikeReading {
  const flags = dv.getUint16(0, true)
  let off = 2
  const out: IndoorBikeReading = {}
  if (!(flags & 0x0001)) { out.speed = dv.getUint16(off, true) / 100; off += 2 } // km/h
  if (flags & 0x0002) off += 2                                    // Average Speed
  if (flags & 0x0004) { out.cadence = dv.getUint16(off, true) / 2; off += 2 } // 0.5 rpm
  if (flags & 0x0008) off += 2                                    // Average Cadence
  if (flags & 0x0010) off += 3                                    // Total Distance (u24)
  if (flags & 0x0020) off += 2                                    // Resistance Level
  if (flags & 0x0040) { out.power = dv.getInt16(off, true); off += 2 }         // Inst. Power
  return out
}

export interface CscReading { crank?: CrankState }

/** CSC Measurement (0x2A5B) : flags(u8) ; données manivelle (bit1) situées
 *  après les données de roue optionnelles (bit0). Cadence pure. */
export function parseCsc(dv: DataView): CscReading {
  const flags = dv.getUint8(0)
  let off = 1
  if (flags & 0x01) off += 6                 // Wheel Revolution Data (u32 + u16)
  if (flags & 0x02 && dv.byteLength >= off + 4) {
    return { crank: { revs: dv.getUint16(off, true), time: dv.getUint16(off + 2, true) } }
  }
  return {}
}

/** Cadence (rpm) à partir de deux relevés de manivelle. Gère le rebouclage des
 *  compteurs 16 bits (revs et time à 1/1024 s wrappent à 65536). null si pas de
 *  progression (pédalage à l'arrêt → pas de nouvel événement). */
export function crankCadence(prev: CrankState, cur: CrankState): number | null {
  const dRev = (cur.revs - prev.revs + 0x10000) & 0xffff
  const dTime = (cur.time - prev.time + 0x10000) & 0xffff
  if (dTime === 0) return null
  const rpm = (dRev * 1024 * 60) / dTime
  if (rpm < 0 || rpm > 250) return null
  return Math.round(rpm)
}
