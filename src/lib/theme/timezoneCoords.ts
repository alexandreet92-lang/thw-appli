// Position approximative depuis le fuseau horaire IANA du device — permet un
// thème jour/nuit adapté à la localisation SANS demander de permission.
// Couvre les zones les plus peuplées ; sinon : latitude par défaut + longitude
// déduite du décalage horaire. Coordonnées = [latitude, longitude] de la zone.

const TZ_COORDS: Record<string, [number, number]> = {
  // Europe
  'Europe/Paris': [48.85, 2.35], 'Europe/London': [51.51, -0.13], 'Europe/Madrid': [40.42, -3.70],
  'Europe/Berlin': [52.52, 13.40], 'Europe/Rome': [41.90, 12.50], 'Europe/Lisbon': [38.72, -9.14],
  'Europe/Amsterdam': [52.37, 4.90], 'Europe/Brussels': [50.85, 4.35], 'Europe/Zurich': [47.37, 8.54],
  'Europe/Vienna': [48.21, 16.37], 'Europe/Stockholm': [59.33, 18.07], 'Europe/Oslo': [59.91, 10.75],
  'Europe/Copenhagen': [55.68, 12.57], 'Europe/Warsaw': [52.23, 21.01], 'Europe/Prague': [50.08, 14.44],
  'Europe/Athens': [37.98, 23.73], 'Europe/Dublin': [53.35, -6.26], 'Europe/Helsinki': [60.17, 24.94],
  'Europe/Bucharest': [44.43, 26.10], 'Europe/Moscow': [55.76, 37.62], 'Europe/Kyiv': [50.45, 30.52],
  'Europe/Istanbul': [41.01, 28.98],
  // Amérique du Nord
  'America/New_York': [40.71, -74.01], 'America/Chicago': [41.88, -87.63], 'America/Denver': [39.74, -104.99],
  'America/Los_Angeles': [34.05, -118.24], 'America/Phoenix': [33.45, -112.07], 'America/Toronto': [43.65, -79.38],
  'America/Vancouver': [49.28, -123.12], 'America/Mexico_City': [19.43, -99.13], 'America/Anchorage': [61.22, -149.90],
  // Amérique du Sud
  'America/Sao_Paulo': [-23.55, -46.63], 'America/Buenos_Aires': [-34.61, -58.38],
  'America/Argentina/Buenos_Aires': [-34.61, -58.38], 'America/Santiago': [-33.45, -70.67],
  'America/Bogota': [4.71, -74.07], 'America/Lima': [-12.05, -77.04],
  // Afrique
  'Africa/Casablanca': [33.57, -7.59], 'Africa/Lagos': [6.52, 3.38], 'Africa/Cairo': [30.04, 31.24],
  'Africa/Johannesburg': [-26.20, 28.05], 'Africa/Nairobi': [-1.29, 36.82], 'Africa/Tunis': [36.81, 10.18],
  'Africa/Algiers': [36.75, 3.06],
  // Moyen-Orient
  'Asia/Dubai': [25.20, 55.27], 'Asia/Riyadh': [24.71, 46.68], 'Asia/Jerusalem': [31.77, 35.21],
  'Asia/Tehran': [35.69, 51.39],
  // Asie
  'Asia/Kolkata': [28.61, 77.21], 'Asia/Karachi': [24.86, 67.01], 'Asia/Dhaka': [23.81, 90.41],
  'Asia/Bangkok': [13.76, 100.50], 'Asia/Jakarta': [-6.21, 106.85], 'Asia/Singapore': [1.35, 103.82],
  'Asia/Kuala_Lumpur': [3.14, 101.69], 'Asia/Manila': [14.60, 120.98], 'Asia/Hong_Kong': [22.32, 114.17],
  'Asia/Shanghai': [31.23, 121.47], 'Asia/Tokyo': [35.68, 139.69], 'Asia/Seoul': [37.57, 126.98],
  'Asia/Taipei': [25.03, 121.57], 'Asia/Ho_Chi_Minh': [10.82, 106.63],
  // Océanie
  'Australia/Sydney': [-33.87, 151.21], 'Australia/Melbourne': [-37.81, 144.96], 'Australia/Brisbane': [-27.47, 153.03],
  'Australia/Perth': [-31.95, 115.86], 'Australia/Adelaide': [-34.93, 138.60], 'Pacific/Auckland': [-36.85, 174.76],
}

export interface Coords { lat: number; lon: number }

/** Coordonnées approximatives à partir du fuseau du device (sans permission). */
export function coordsFromTimezone(): Coords {
  let tz = ''
  try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '' } catch { /* ignore */ }
  const hit = TZ_COORDS[tz]
  if (hit) return { lat: hit[0], lon: hit[1] }
  // Inconnu : longitude depuis le décalage horaire, latitude par défaut (40°).
  const offsetMin = new Date().getTimezoneOffset() // minutes derrière UTC
  const lon = -offsetMin / 4 // 15°/h = 0.25°/min
  return { lat: 40, lon }
}
