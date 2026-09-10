// ══════════════════════════════════════════════════════════════════════════
// Géocodage inverse (lat/lng → « Ville, Région ») via Mapbox, mis en cache
// (mémoire + localStorage) et dédoublonné par requête. Retourne '' si indispo.
// ══════════════════════════════════════════════════════════════════════════
const TOKEN = process.env.NEXT_PUBLIC_MAPBOX ?? ''
const mem = new Map<string, string>()
const inflight = new Map<string, Promise<string>>()

function keyOf(lat: number, lng: number): string {
  return `${lat.toFixed(3)},${lng.toFixed(3)}`
}

export function cachedPlace(lat: number, lng: number): string | undefined {
  const k = keyOf(lat, lng)
  if (mem.has(k)) return mem.get(k)
  try {
    const v = localStorage.getItem(`geo:${k}`)
    if (v != null) { mem.set(k, v); return v }
  } catch { /* ignore */ }
  return undefined
}

export async function reverseGeocode(lat: number, lng: number): Promise<string> {
  const k = keyOf(lat, lng)
  const cached = cachedPlace(lat, lng)
  if (cached !== undefined) return cached
  if (!TOKEN) return ''
  if (inflight.has(k)) return inflight.get(k)!
  const p = (async () => {
    try {
      const r = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${TOKEN}&types=place,region&language=fr&limit=1`)
      const j = await r.json() as { features?: { text?: string; context?: { id: string; text: string }[] }[] }
      const f = j.features?.[0]
      let out = ''
      if (f) {
        const place = f.text ?? ''
        const region = f.context?.find(c => c.id.startsWith('region'))?.text ?? ''
        out = [place, region].filter(Boolean).join(', ')
      }
      mem.set(k, out)
      try { localStorage.setItem(`geo:${k}`, out) } catch { /* ignore */ }
      return out
    } catch {
      return ''
    } finally {
      inflight.delete(k)
    }
  })()
  inflight.set(k, p)
  return p
}
