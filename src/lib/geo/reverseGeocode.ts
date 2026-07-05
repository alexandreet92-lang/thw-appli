// ══════════════════════════════════════════════════════════════════
// reverseGeocode — nom de lieu « Ville, Région » depuis des coordonnées,
// via l'API Mapbox Geocoding. Résultat mis en cache (mémoire + localStorage)
// pour ne pas rappeler l'API à chaque rendu.
// ══════════════════════════════════════════════════════════════════
const TOKEN = process.env.NEXT_PUBLIC_MAPBOX ?? ''
const mem = new Map<string, string>()

interface MbContext { id?: string; text?: string }
interface MbFeature { text?: string; place_name?: string; context?: MbContext[] }

export async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  if (!TOKEN || !isFinite(lat) || !isFinite(lng)) return null
  const key = `${lat.toFixed(3)},${lng.toFixed(3)}`
  if (mem.has(key)) return mem.get(key) ?? null
  try { const ls = localStorage.getItem('thwgeo:' + key); if (ls) { mem.set(key, ls); return ls } } catch { /* ignore */ }
  try {
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?types=place,locality&language=fr&limit=1&access_token=${TOKEN}`
    const res = await fetch(url)
    if (!res.ok) return null
    const j = await res.json() as { features?: MbFeature[] }
    const f = j.features?.[0]
    if (!f?.text) return null
    // Ville + plus petit niveau administratif dispo (district ≈ département, sinon région).
    const admin = f.context?.find(c => c.id?.startsWith('district'))?.text
      ?? f.context?.find(c => c.id?.startsWith('region'))?.text
    const name = admin && admin !== f.text ? `${f.text}, ${admin}` : f.text
    mem.set(key, name)
    try { localStorage.setItem('thwgeo:' + key, name) } catch { /* ignore */ }
    return name
  } catch { return null }
}
