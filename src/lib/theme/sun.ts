// Lever / coucher du soleil — algorithme SunCalc (MIT), autonome, sans API.
// Sert au thème auto (jour = clair, nuit = sombre) selon la position réelle.

const rad = Math.PI / 180
const dayMs = 86_400_000
const J1970 = 2440588
const J2000 = 2451545
const e = rad * 23.4397 // obliquité de l'écliptique

const toJulian = (d: Date) => d.valueOf() / dayMs - 0.5 + J1970
const fromJulian = (j: number) => new Date((j + 0.5 - J1970) * dayMs)
const toDays = (d: Date) => toJulian(d) - J2000

const solarMeanAnomaly = (d: number) => rad * (357.5291 + 0.98560028 * d)
function eclipticLongitude(M: number): number {
  const C = rad * (1.9148 * Math.sin(M) + 0.02 * Math.sin(2 * M) + 0.0003 * Math.sin(3 * M))
  const P = rad * 102.9372
  return M + C + P + Math.PI
}
const declination = (l: number) => Math.asin(Math.sin(e) * Math.sin(l))

const J0 = 0.0009
const julianCycle = (d: number, lw: number) => Math.round(d - J0 - lw / (2 * Math.PI))
const approxTransit = (Ht: number, lw: number, n: number) => J0 + (Ht + lw) / (2 * Math.PI) + n
const solarTransitJ = (ds: number, M: number, L: number) => J2000 + ds + 0.0053 * Math.sin(M) - 0.0069 * Math.sin(2 * L)
const hourAngle = (h: number, phi: number, d: number) =>
  Math.acos((Math.sin(h) - Math.sin(phi) * Math.sin(d)) / (Math.cos(phi) * Math.cos(d)))

export interface SunTimes { sunrise: Date; sunset: Date }

/** Heures de lever/coucher (UTC) pour une date + position. Null si jour/nuit polaire. */
export function getSunTimes(date: Date, lat: number, lng: number): SunTimes | null {
  const lw = rad * -lng
  const phi = rad * lat
  const d = toDays(date)
  const n = julianCycle(d, lw)
  const ds = approxTransit(0, lw, n)
  const M = solarMeanAnomaly(ds)
  const L = eclipticLongitude(M)
  const dec = declination(L)
  const Jnoon = solarTransitJ(ds, M, L)
  const h0 = -0.833 * rad // soleil au ras de l'horizon (réfraction)
  const w = hourAngle(h0, phi, dec)
  if (Number.isNaN(w)) return null // jour ou nuit polaire
  const Jset = solarTransitJ(approxTransit(w, lw, n), M, L)
  const Jrise = Jnoon - (Jset - Jnoon)
  return { sunrise: fromJulian(Jrise), sunset: fromJulian(Jset) }
}

/** True si le soleil est levé maintenant à cette position. Repli heure locale 7h–20h. */
export function isDaytime(lat: number, lng: number, now: Date = new Date()): boolean {
  const t = getSunTimes(now, lat, lng)
  if (!t) {
    // Jour/nuit polaire : on retombe sur l'heure locale.
    const h = now.getHours()
    return h >= 7 && h < 20
  }
  return now >= t.sunrise && now <= t.sunset
}
